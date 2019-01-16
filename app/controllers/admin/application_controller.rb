# frozen_string_literal: true

# Provides a base class for Admin controllers to subclass
#
# Automatically sets the layout and ensures an administrator is logged in
class Admin::ApplicationController < ApplicationController
  prepend EE::Admin::ApplicationController # rubocop: disable Cop/InjectEnterpriseEditionModule

  before_action :authenticate_admin!
  layout 'admin'

  def authenticate_admin!
    render_404 unless current_user.admin?
  end
end
