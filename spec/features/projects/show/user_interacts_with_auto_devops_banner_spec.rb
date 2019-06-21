# frozen_string_literal: true

require 'spec_helper'

describe 'Project > Show > User interacts with auto devops implicitly enabled banner' do
  let(:project) { create(:project, :repository) }
  let(:user) { create(:user) }

  before do
    project.add_user(user, role)
    sign_in(user)
  end

  context 'when user does not have maintainer access' do
    let(:role) { :developer }

    context 'when AutoDevOps is implicitly enabled' do
      it 'does not display AutoDevOps implicitly enabled banner' do
        expect(page).not_to have_css('.auto-devops-implicitly-enabled-banner')
      end
    end
  end

  context 'when user has mantainer access' do
    let(:role) { :maintainer }

    context 'when AutoDevOps is implicitly enabled' do
      before do
        allow_any_instance_of(Project).to receive(:any_runners?).and_return true
        stub_application_setting(auto_devops_enabled: true)

        visit project_path(project)
      end

      it 'display AutoDevOps implicitly enabled banner' do
        expect(page).to have_css('.auto-devops-implicitly-enabled-banner')
      end

      context 'when user dismisses the banner', :js do
        it 'does not display AutoDevOps implicitly enabled banner' do
          find('.hide-auto-devops-implicitly-enabled-banner').click
          wait_for_requests
          visit project_path(project)

          expect(page).not_to have_css('.auto-devops-implicitly-enabled-banner')
        end
      end
    end

    context 'when AutoDevOps is not implicitly enabled' do
      before do
        stub_application_setting(auto_devops_enabled: false)

        visit project_path(project)
      end

      it 'does not display AutoDevOps implicitly enabled banner' do
        expect(page).not_to have_css('.auto-devops-implicitly-enabled-banner')
      end
    end
  end
end
