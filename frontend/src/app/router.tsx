import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/admin-layout'
import { AppLayout } from '@/components/layout/app-layout'
import { PublicLayout } from '@/components/layout/public-layout'
import { ForbiddenPage, NotFoundPage, RouteErrorPage } from '@/components/feedback/error-pages'
import { AdminChallengesPage } from '@/features/admin/pages/challenges-admin-page'
import { AdminOpsPage } from '@/features/admin/pages/ops-page'
import { AdminOverviewPage } from '@/features/admin/pages/overview-page'
import { AdminReportsPage } from '@/features/admin/pages/reports-page'
import { AdminUsersPage } from '@/features/admin/pages/users-page'
import { LoginPage } from '@/features/auth/login-page'
import { ProfilePage } from '@/features/auth/profile-page'
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from '@/features/auth/guards'
import { RegisterPage } from '@/features/auth/register-page'
import { ChallengePage } from '@/features/challenges/pages/challenge-page'
import { ChallengesPage } from '@/features/challenges/pages/challenges-page'
import { CommunityFeedPage } from '@/features/community/pages/feed-page'
import { PostEditorPage } from '@/features/community/pages/post-editor-page'
import { PostPage } from '@/features/community/pages/post-page'
import { PublicProfilePage } from '@/features/community/public-profile-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { LandingPage } from '@/features/dashboard/landing-page'
import { AlgorithmPage } from '@/features/dsa/pages/algorithm-page'
import { TopicPage } from '@/features/dsa/pages/topic-page'
import { TopicsPage } from '@/features/dsa/pages/topics-page'
import { LeaderboardPage } from '@/features/leaderboard/leaderboard-page'
import { SubmissionDetailPage } from '@/features/submissions/pages/submission-detail-page'
import { SubmissionsPage } from '@/features/submissions/pages/submissions-page'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'topics', element: <TopicsPage /> },
      { path: 'topics/:slug', element: <TopicPage /> },
      { path: 'algorithms/:slug', element: <AlgorithmPage /> },
      { path: 'challenges', element: <ChallengesPage /> },
      { path: 'challenges/:slug', element: <ChallengePage /> },
      { path: 'playground', element: <Navigate to="/challenges" replace /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'community', element: <CommunityFeedPage /> },
      { path: 'community/:slug', element: <PostPage /> },
      { path: 'u/:username', element: <PublicProfilePage /> },
      {
        path: 'login',
        element: (
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'register',
        element: (
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        ),
      },
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'submissions', element: <SubmissionsPage /> },
      { path: 'submissions/:id', element: <SubmissionDetailPage /> },
      { path: 'community/new', element: <PostEditorPage /> },
      { path: 'community/:slug/edit', element: <PostEditorPage /> },
    ],
  },
  {
    path: 'admin',
    element: (
      <RequireRole role="admin">
        <AdminLayout />
      </RequireRole>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'challenges', element: <AdminChallengesPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
      { path: 'ops', element: <AdminOpsPage /> },
    ],
  },
])
