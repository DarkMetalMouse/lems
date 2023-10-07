import { Stack } from '@mui/material';
import { ScoresheetStatusTypes } from '@lems/types';
import { localizedScoresheetStatus } from '@lems/season';
import EditScoresheetButton from './edit-scoresheet-button';

const ScoresheetStatusReferences = () => {
  return (
    <Stack direction="row" justifyContent="center">
      {ScoresheetStatusTypes.map(status => {
        return (
          <EditScoresheetButton key={status} status={status} active={true}>
            {localizedScoresheetStatus[status]}
          </EditScoresheetButton>
        );
      })}
    </Stack>
  );
};

export default ScoresheetStatusReferences;
