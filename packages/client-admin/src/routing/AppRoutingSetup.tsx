import { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router";
import { DefaultPage, Demo1DarkSidebarPage } from "@/pages/dashboards";
import { TrackTracePage } from "@/pages/stts/TrackTracePage";
import {
  ProfileActivityPage,
  ProfileBloggerPage,
  CampaignsCardPage,
  CampaignsListPage,
  ProjectColumn2Page,
  ProjectColumn3Page,
  ProfileCompanyPage,
  ProfileCreatorPage,
  ProfileCRMPage,
  ProfileDefaultPage,
  ProfileEmptyPage,
  ProfileFeedsPage,
  ProfileGamerPage,
  ProfileModalPage,
  ProfileNetworkPage,
  ProfileNFTPage,
  ProfilePlainPage,
  ProfileTeamsPage,
  ProfileWorksPage,
} from "@/pages/public-profile";
import {
  AccountActivityPage,
  AccountAllowedIPAddressesPage,
  AccountApiKeysPage,
  AccountAppearancePage,
  AccountBackupAndRecoveryPage,
  AccountBasicPage,
  AccountCompanyProfilePage,
  AccountCurrentSessionsPage,
  AccountDeviceManagementPage,
  AccountEnterprisePage,
  AccountGetStartedPage,
  AccountHistoryPage,
  AccountImportMembersPage,
  AccountIntegrationsPage,
  AccountInviteAFriendPage,
  AccountMembersStarterPage,
  AccountNotificationsPage,
  AccountOverviewPage,
  AccountPermissionsCheckPage,
  AccountPermissionsTogglePage,
  AccountPlansPage,
  AccountPrivacySettingsPage,
  AccountRolesPage,
  AccountSecurityGetStartedPage,
  AccountSecurityLogPage,
  AccountSettingsEnterprisePage,
  AccountSettingsModalPage,
  AccountSettingsPlainPage,
  AccountSettingsSidebarPage,
  AccountTeamInfoPage,
  AccountTeamMembersPage,
  AccountTeamsPage,
  AccountTeamsStarterPage,
  AccountUserProfilePage,
} from "@/pages/account";
import {
  NetworkAppRosterPage,
  NetworkMarketAuthorsPage,
  NetworkAuthorPage,
  NetworkGetStartedPage,
  NetworkMiniCardsPage,
  NetworkNFTPage,
  NetworkSocialPage,
  NetworkUserCardsTeamCrewPage,
  NetworkSaasUsersPage,
  NetworkStoreClientsPage,
  NetworkUserTableTeamCrewPage,
  NetworkVisitorsPage,
} from "@/pages/network";

import { AuthPage } from "@/auth";
import { RequireAuth } from "@/auth/RequireAuth";
import { Demo1Layout } from "@/layouts/demo1";
import { ErrorsRouting } from "@/errors";
import {
  AuthenticationWelcomeMessagePage,
  AuthenticationAccountDeactivatedPage,
  AuthenticationGetStartedPage,
} from "@/pages/authentication";
import { SR4ListPage } from "@/pages/forms/SR4ListPage";
import { PermissionGuard } from "@/auth/PermissionGuard";
// import { SR6ListPage } from "@/pages/forms/SR6 forms/SR6ListPage";
import { UsersListPage } from "@/pages/users/UsersListPage";
import CropsListPage from "@/pages/crops/CropsListPage";
import CropDetailsPage from "@/pages/crops/CropDetailsPage";
import ImportPermitsListPage from "@/pages/import-permits/ImportPermitsListPage";
import { QDSListPage } from "@/pages/forms/QDS forms/QDSListPage";
import MySr4ApplicationForms from "@/pages/forms/my_application_forms/MySr4ApplicationForms";
// import MySr6ApplicationForms from "@/pages/forms/my_application_forms/MySr6ApplicationForms";
import MyQdsApplicationForms from "@/pages/forms/my_application_forms/MyQdsApplicationForms";
import MarketplacePage from "@/pages/marketplace/products/MarketplacePage";
import OrdersPage from "@/pages/marketplace/orders/OrdersPage";
import PreOrdersPage from "@/pages/marketplace/pre-orders/PreOrdersPage";
import { LevelsPage } from "@/pages/levels/LevelsPage";
import { ModulesPage } from "@/pages/modules-lessons/ModulesPage";
import { ModuleLessonsPage } from "@/pages/modules-lessons/ModuleLessonsPage";
import { RolesListPage } from "@/pages/roles/RolesListPage";

const AppRoutingSetup = (): ReactElement => {
  return (
    <Routes>
      {/* Explicit reset-password route registrations + legacy URL compatibility */}
      <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
      
      <Route
        path="/classic/reset-password"
        element={<Navigate to="/auth/classic/reset-password" replace />}
      />
      <Route
        path="/classic/reset-password/change"
        element={
          <Navigate
            to={{ pathname: "/auth/classic/reset-password/change", search: window.location.search }}
            replace
          />
        }
      />
      
      <Route
        path="/auth/reset-password/change"
        element={
          <Navigate
            to={{ pathname: "/auth/reset-password/change", search: window.location.search }}
            replace
          />
        }
      />

      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          {/* No UGSL dashboard yet; the seed-tracking one queries data this server doesn't have */}
          <Route path="/" element={
              <PermissionGuard required={["can_view_content"]}>
                <LevelsPage />
              </PermissionGuard>
            } />

          {/* Content management */}
          <Route
            path="/content/levels"
            element={
              <PermissionGuard required={["can_view_content"]}>
                <LevelsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/content/modules"
            element={
              <PermissionGuard required={["can_view_content"]}>
                <ModulesPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/content/modules/:moduleId"
            element={
              <PermissionGuard required={["can_view_content"]}>
                <ModuleLessonsPage />
              </PermissionGuard>
            }
          />
          <Route path="/dark-sidebar" element={<Demo1DarkSidebarPage />} />
          <Route path="/track-trace" element={<TrackTracePage />} />
          

          
          <Route path="/admin/roles" element={<RolesListPage />} />
          <Route path="/admin/users" element={<UsersListPage />} />
          
          {/* <Route path="/admin/roles" element={
            <PermissionGuard required={["can_manage_roles"]}>
                <RolesListPage />
              </PermissionGuard>
            } /> */}
          <Route path="/admin/crops" element={
            <PermissionGuard required={["can_manage_crops"]}>
                <CropsListPage />
              </PermissionGuard>
            } />
          <Route path="/admin/crops/:id" element={<CropDetailsPage />} />
          <Route path="/admin/users" element={
            <PermissionGuard required={["can_manage_users"]}>
                <UsersListPage />
              </PermissionGuard>
            } />
          {/* <Route
            path="/admin/seed-label-packages"
            element={
            <PermissionGuard required={["can_manage_seed_label_packages"]}>
                <SeedLabelPackagesPage />
              </PermissionGuard>
            } /> */}
          <Route
            path="/public-profile/profiles/default"
            element={<ProfileDefaultPage />}
          />
          <Route
            path="/public-profile/profiles/creator"
            element={<ProfileCreatorPage />}
          />
          <Route
            path="/public-profile/profiles/company"
            element={<ProfileCompanyPage />}
          />
          <Route
            path="/public-profile/profiles/nft"
            element={<ProfileNFTPage />}
          />
          <Route
            path="/public-profile/profiles/blogger"
            element={<ProfileBloggerPage />}
          />
          <Route
            path="/public-profile/profiles/crm"
            element={<ProfileCRMPage />}
          />
          <Route
            path="/public-profile/profiles/gamer"
            element={<ProfileGamerPage />}
          />
          <Route
            path="/public-profile/profiles/feeds"
            element={<ProfileFeedsPage />}
          />
          <Route
            path="/public-profile/profiles/plain"
            element={<ProfilePlainPage />}
          />
          <Route
            path="/public-profile/profiles/modal"
            element={<ProfileModalPage />}
          />
          <Route
            path="/public-profile/projects/3-columns"
            element={<ProjectColumn3Page />}
          />
          <Route
            path="/public-profile/projects/2-columns"
            element={<ProjectColumn2Page />}
          />
          <Route path="/public-profile/works" element={<ProfileWorksPage />} />
          <Route path="/public-profile/teams" element={<ProfileTeamsPage />} />
          <Route
            path="/public-profile/network"
            element={<ProfileNetworkPage />}
          />
          <Route
            path="/public-profile/activity"
            element={<ProfileActivityPage />}
          />
          <Route
            path="/public-profile/campaigns/card"
            element={<CampaignsCardPage />}
          />
          <Route
            path="/public-profile/campaigns/list"
            element={<CampaignsListPage />}
          />
          <Route path="/public-profile/empty" element={<ProfileEmptyPage />} />
          <Route
            path="/account/home/get-started"
            element={<AccountGetStartedPage />}
          />
          <Route
            path="/account/home/user-profile"
            element={<AccountUserProfilePage />}
          />
          <Route
            path="/account/home/company-profile"
            element={<AccountCompanyProfilePage />}
          />
          <Route
            path="/account/home/settings-sidebar"
            element={<AccountSettingsSidebarPage />}
          />
          <Route
            path="/account/home/settings-enterprise"
            element={<AccountSettingsEnterprisePage />}
          />
          <Route
            path="/account/home/settings-plain"
            element={<AccountSettingsPlainPage />}
          />
          <Route
            path="/account/home/settings-modal"
            element={<AccountSettingsModalPage />}
          />
          <Route path="/account/billing/basic" element={<AccountBasicPage />} />
          <Route
            path="/account/billing/enterprise"
            element={<AccountEnterprisePage />}
          />
          <Route path="/account/billing/plans" element={<AccountPlansPage />} />
          <Route
            path="/account/billing/history"
            element={<AccountHistoryPage />}
          />
          <Route
            path="/account/security/get-started"
            element={<AccountSecurityGetStartedPage />}
          />
          <Route
            path="/account/security/overview"
            element={<AccountOverviewPage />}
          />
          <Route
            path="/account/security/allowed-ip-addresses"
            element={<AccountAllowedIPAddressesPage />}
          />
          <Route
            path="/account/security/privacy-settings"
            element={<AccountPrivacySettingsPage />}
          />
          <Route
            path="/account/security/device-management"
            element={<AccountDeviceManagementPage />}
          />
          <Route
            path="/account/security/backup-and-recovery"
            element={<AccountBackupAndRecoveryPage />}
          />
          <Route
            path="/account/security/current-sessions"
            element={<AccountCurrentSessionsPage />}
          />
          <Route
            path="/account/security/security-log"
            element={<AccountSecurityLogPage />}
          />
          <Route
            path="/account/members/team-starter"
            element={<AccountTeamsStarterPage />}
          />
          <Route path="/account/members/teams" element={<AccountTeamsPage />} />
          <Route
            path="/account/members/team-info"
            element={<AccountTeamInfoPage />}
          />
          <Route
            path="/account/members/members-starter"
            element={<AccountMembersStarterPage />}
          />
          <Route
            path="/account/members/team-members"
            element={<AccountTeamMembersPage />}
          />
          <Route
            path="/account/members/import-members"
            element={<AccountImportMembersPage />}
          />
          <Route path="/account/members/roles" element={<AccountRolesPage />} />
          <Route
            path="/account/members/permissions-toggle"
            element={<AccountPermissionsTogglePage />}
          />
          <Route
            path="/account/members/permissions-check"
            element={<AccountPermissionsCheckPage />}
          />
          <Route
            path="/account/integrations"
            element={<AccountIntegrationsPage />}
          />
          <Route
            path="/account/notifications"
            element={<AccountNotificationsPage />}
          />
          <Route path="/account/api-keys" element={<AccountApiKeysPage />} />
          <Route
            path="/account/appearance"
            element={<AccountAppearancePage />}
          />
          <Route
            path="/account/invite-a-friend"
            element={<AccountInviteAFriendPage />}
          />
          <Route path="/account/activity" element={<AccountActivityPage />} />
          <Route
            path="/network/get-started"
            element={<NetworkGetStartedPage />}
          />
          <Route
            path="/network/user-cards/mini-cards"
            element={<NetworkMiniCardsPage />}
          />
          <Route
            path="/network/user-cards/team-crew"
            element={<NetworkUserCardsTeamCrewPage />}
          />
          <Route
            path="/network/user-cards/author"
            element={<NetworkAuthorPage />}
          />
          <Route path="/network/user-cards/nft" element={<NetworkNFTPage />} />
          <Route
            path="/network/user-cards/social"
            element={<NetworkSocialPage />}
          />
          <Route
            path="/network/user-table/team-crew"
            element={<NetworkUserTableTeamCrewPage />}
          />
          <Route
            path="/network/user-table/app-roster"
            element={<NetworkAppRosterPage />}
          />
          <Route
            path="/network/user-table/market-authors"
            element={<NetworkMarketAuthorsPage />}
          />
          <Route
            path="/network/user-table/saas-users"
            element={<NetworkSaasUsersPage />}
          />
          <Route
            path="/network/user-table/store-clients"
            element={<NetworkStoreClientsPage />}
          />
          <Route
            path="/network/user-table/visitors"
            element={<NetworkVisitorsPage />}
          />
          <Route
            path="/auth/welcome-message"
            element={<AuthenticationWelcomeMessagePage />}
          />
          <Route
            path="/auth/account-deactivated"
            element={<AuthenticationAccountDeactivatedPage />}
          />
          <Route
            path="/authentication/get-started"
            element={<AuthenticationGetStartedPage />}
          />
        </Route>
      </Route>
      <Route path="error/*" element={<ErrorsRouting />} />
      <Route path="auth/*" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/error/404" />} />
    </Routes>
  );
};

export { AppRoutingSetup };
