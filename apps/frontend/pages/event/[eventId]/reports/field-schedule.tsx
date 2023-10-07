import { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { WithId } from 'mongodb';
import Grid from '@mui/material/Unstable_Grid2';
import { Event, Team, SafeUser, RoleTypes, RobotGameMatch, RobotGameTable } from '@lems/types';
import { RoleAuthorizer } from '../../../../components/role-authorizer';
import ConnectionIndicator from '../../../../components/connection-indicator';
import Layout from '../../../../components/layout';
import ReportRoundSchedule from '../../../../components/field/report-round-schedule';
import { apiFetch, serverSideGetRequests } from '../../../../lib/utils/fetch';
import { localizedRoles } from '../../../../localization/roles';
import { useWebsocket } from '../../../../hooks/use-websocket';

interface Props {
  user: WithId<SafeUser>;
  event: WithId<Event>;
  teams: Array<WithId<Team>>;
  tables: Array<WithId<RobotGameTable>>;
  matches: Array<WithId<RobotGameMatch>>;
}

const Page: NextPage<Props> = ({ user, event, teams: initialTeams, tables, matches }) => {
  const router = useRouter();
  const [showGeneralSchedule, setShowGeneralSchedule] = useState<boolean>(true);
  const [teams, setTeams] = useState<Array<WithId<Team>>>(initialTeams);

  const refereeGeneralSchedule =
    (showGeneralSchedule && event.schedule?.filter(s => s.roles.includes('referee'))) || [];

  const handleTeamRegistered = (team: WithId<Team>) => {
    setTeams(teams =>
      teams.map(t => {
        if (t._id == team._id) {
          return team;
        } else {
          return t;
        }
      })
    );
  };

  const { connectionStatus } = useWebsocket(event._id.toString(), ['pit-admin'], undefined, [
    { name: 'teamRegistered', handler: handleTeamRegistered }
  ]);

  const practiceMatches = matches.filter(m => m.type === 'practice');
  const rankingMatches = matches.filter(m => m.type === 'ranking');

  const roundSchedules = [...new Set(practiceMatches.flatMap(m => m.round))]
    .map(r => (
      <Grid xs={12} xl={6} key={'practice' + r}>
        <ReportRoundSchedule
          eventSchedule={refereeGeneralSchedule}
          roundType={'practice'}
          roundNumber={r}
          matches={practiceMatches.filter(m => m.round === r)}
          tables={tables}
          teams={teams}
        />
      </Grid>
    ))
    .concat(
      [...new Set(rankingMatches.flatMap(m => m.round))].map(r => (
        <Grid xs={12} xl={6} key={'ranking' + r}>
          <ReportRoundSchedule
            eventSchedule={refereeGeneralSchedule}
            roundType={'ranking'}
            roundNumber={r}
            matches={rankingMatches.filter(m => m.round === r)}
            tables={tables}
            teams={teams}
          />
        </Grid>
      ))
    );

  return (
    <RoleAuthorizer user={user} allowedRoles={[...RoleTypes]} onFail={() => router.back()}>
      <Layout
        maxWidth="xl"
        title={`ממשק ${user.role && localizedRoles[user.role].name} - לו״ז שיפוט | ${event.name}`}
        error={connectionStatus === 'disconnected'}
        action={<ConnectionIndicator status={connectionStatus} />}
        back={`/event/${event._id}/reports`}
        backDisabled={connectionStatus !== 'connecting'}
      >
        <Grid container spacing={2} my={4}>
          {...roundSchedules}
        </Grid>
      </Layout>
    </RoleAuthorizer>
  );
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  try {
    const user = await apiFetch(`/api/me`, undefined, ctx).then(res => res?.json());

    const data = await serverSideGetRequests(
      {
        event: `/api/events/${user.event}?withSchedule=true`,
        teams: `/api/events/${user.event}/teams`,
        tables: `/api/events/${user.event}/tables`,
        matches: `/api/events/${user.event}/matches`
      },
      ctx
    );

    return { props: { user, ...data } };
  } catch (err) {
    console.log(err);
    return { redirect: { destination: '/login', permanent: false } };
  }
};

export default Page;
