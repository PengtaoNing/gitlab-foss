module MergeRequests
  # MergeService class
  #
  # Do git merge and in case of success
  # mark merge request as merged and execute all hooks and notifications
  # Executed when you do merge via GitLab UI
  #
  class MergeService < MergeRequests::BaseService
    MergeError = Class.new(StandardError)

    attr_reader :merge_request, :source

    def execute(merge_request)
      @merge_request = merge_request

      unless @merge_request.mergeable?
        return handle_merge_error(log_message: 'Merge request is not mergeable', save_message_on_model: true)
      end

      @source = find_merge_source

      unless @source
        return handle_merge_error(log_message: 'No source for merge', save_message_on_model: true)
      end

      merge_request.in_locked_state do
        if commit
          after_merge
          clean_merge_jid
          success
        end
      end
    rescue MergeError => e
      handle_merge_error(log_message: e.message, save_message_on_model: true)
    end

    private

    def commit
      committer = repository.user_to_committer(current_user)

      options = {
        message: params[:commit_message] || merge_request.merge_commit_message,
        author: committer,
        committer: committer
      }

      commit_id = repository.merge(current_user, source, merge_request, options)

      raise MergeError, 'Conflicts detected during merge' unless commit_id

      merge_request.update(merge_commit_sha: commit_id)
    rescue Gitlab::Git::HooksService::PreReceiveError => e
      raise MergeError, e.message
    rescue StandardError => e
      raise MergeError, "Something went wrong during merge: #{e.message}"
    ensure
      merge_request.update(in_progress_merge_commit_sha: nil)
    end

    def after_merge
      MergeRequests::PostMergeService.new(project, current_user).execute(merge_request)

      if params[:should_remove_source_branch].present? || @merge_request.force_remove_source_branch?
        # Verify again that the source branch can be removed, since branch may be protected,
        # or the source branch may have been updated.
        if @merge_request.can_remove_source_branch?(branch_deletion_user)
          DeleteBranchService.new(@merge_request.source_project, branch_deletion_user)
            .execute(merge_request.source_branch)
        end
      end
    end

    def clean_merge_jid
      merge_request.update_column(:merge_jid, nil)
    end

    def branch_deletion_user
      @merge_request.force_remove_source_branch? ? @merge_request.author : current_user
    end

    # Logs merge error message and cleans `MergeRequest#merge_jid`.
    #
    def handle_merge_error(log_message:, save_message_on_model: false)
      Rails.logger.error("MergeService ERROR: #{merge_request_info} - #{log_message}")

      if save_message_on_model
        @merge_request.update(merge_error: log_message, merge_jid: nil)
      else
        clean_merge_jid
      end
    end

    def merge_request_info
      merge_request.to_reference(full: true)
    end

    def find_merge_source
      merge_request.diff_head_sha
    end
  end
end
