import { Form, Formik, FormikValues } from 'formik';
import { Socket } from 'socket.io-client';
import {
  Table,
  TableContainer,
  TableHead,
  TableCell,
  TableBody,
  TableRow,
  Typography,
  Stack,
  Paper,
  Divider,
  Button,
  Box
} from '@mui/material';
import {
  CVFormCategory,
  CVFormCategoryNames,
  CVFormCategoryNamesTypes,
  CVFormSubject,
  CoreValuesForm,
  Event,
  WSClientEmittedEvents,
  WSServerEmittedEvents,
  SafeUser
} from '@lems/types';
import { cvFormSchema } from '@lems/season';
import FormikTextField from '../general/forms/formik-text-field';
import CVFormHeader from './cv-form-header';
import CVFormCategoryRow from './cv-form-category-row';
import { WithId } from 'mongodb';
import { enqueueSnackbar } from 'notistack';
import { RoleAuthorizer } from '../role-authorizer';

interface CVFormProps {
  user: WithId<SafeUser>;
  event: WithId<Event>;
  socket: Socket<WSServerEmittedEvents, WSClientEmittedEvents>;
  cvForm?: WithId<CoreValuesForm>;
  readOnly?: boolean;
}

const CVForm: React.FC<CVFormProps> = ({
  user,
  event,
  socket,
  cvForm: initialCvForm,
  readOnly = false
}) => {
  const getEmptyCVForm = () => {
    const eventId = event._id;
    const observers: Array<CVFormSubject> = [];
    const observerAffiliation = '';
    const demonstrators: Array<CVFormSubject> = [];
    const demonstratorAffiliation = '';
    const data: { [key in CVFormCategoryNames]: CVFormCategory } = {} as {
      [key in CVFormCategoryNames]: CVFormCategory;
    };
    CVFormCategoryNamesTypes.forEach(name => {
      const category = cvFormSchema.categories.find(category => category.id === name);
      data[name] = {
        teamOrStudent: {
          fields: category?.teamOrStudent.map(() => false) || [],
          other: ''
        },
        anyoneElse: {
          fields: category?.anyoneElse.map(() => false) || [],
          other: ''
        }
      } as CVFormCategory;
    });
    const details = '';
    const completedBy = {
      name: '',
      phone: '',
      affiliation: ''
    };
    const actionTaken = '';
    return {
      eventId,
      observers,
      observerAffiliation,
      demonstrators,
      demonstratorAffiliation,
      data,
      details,
      completedBy,
      actionTaken
    };
  };

  const validateForm = (formValues: FormikValues) => {
    const errors: any = {};

    if (formValues.observers.length === 0) {
      errors.observers = 'שדה חובה';
    } else if (
      formValues.observers.find(
        (subject: CVFormSubject) => subject === 'team' && !formValues.observerAffiliation
      )
    ) {
      errors.observerAffiliation = 'נא לציין מספר קבוצה';
    }

    if (formValues.demonstrators.length === 0) {
      errors.demonstrators = 'שדה חובה';
    } else if (
      formValues.demonstrators.find(
        (subject: CVFormSubject) => subject === 'team' && !formValues.demonstratorAffiliation
      )
    ) {
      errors.demonstratorAffiliation = 'נא לציין מספר קבוצה';
    }

    if (
      !Object.values(formValues.data)
        .flatMap(c => {
          const category = c as {
            teamOrStudent: { fields: Array<boolean>; other?: string };
            anyoneElse: { fields: Array<boolean>; other?: string };
          };
          return category.teamOrStudent.fields.concat(category.anyoneElse.fields);
        })
        .some((x: boolean) => x)
    ) {
      errors.data = 'נא לסמן לפחות שדה אחד';
    }

    if (!formValues.details) {
      errors.details = 'יש למלא את תיאור המקרה';
    }
    if (
      !formValues.completedBy.name ||
      !formValues.completedBy.phone ||
      !formValues.completedBy.affiliation
    ) {
      errors.completedBy = 'נא למלא את פרטי ממלא הטופס';
    }
    return errors;
  };

  const getFormSeverity = (formValues: FormikValues) => {
    let severity: CVFormCategoryNames = 'standardExpectations';
    const { data } = formValues;

    const anyCategoryField = (category: CVFormCategory): boolean => {
      const allFields = category.teamOrStudent.fields.concat(category.anyoneElse.fields);
      return !!(
        allFields.some((x: boolean) => x) ||
        category.teamOrStudent.other ||
        category.anyoneElse.other
      );
    };

    [
      'aboveExpectations',
      'exceedsExpectations',
      'possibleConcern',
      'belowExpectations',
      'inappropriate'
    ].forEach(category => {
      if (anyCategoryField(data[category])) severity = category as CVFormCategoryNames;
    });

    return severity;
  };

  return (
    <Formik
      initialValues={initialCvForm || getEmptyCVForm()}
      validate={validateForm}
      onSubmit={(values, actions) => {
        const severity = getFormSeverity(values);
        socket.emit(
          initialCvForm ? 'updateCvForm' : 'createCvForm',
          event._id.toString(),
          { ...values, severity },
          response => {
            if (response.ok) {
              enqueueSnackbar('הטופס הוגש בהצלחה!', { variant: 'success' });
              actions.resetForm();
            } else {
              enqueueSnackbar('אופס, לא הצלחנו להגיש את טופס ערכי הליבה.', { variant: 'error' });
            }
          }
        );
        actions.setSubmitting(false);
      }}
      validateOnChange
      validateOnMount
    >
      {({ values, isValid, submitForm }) => (
        <Form>
          <CVFormHeader values={values} readOnly={readOnly} />
          <TableContainer component={Paper} sx={{ mt: 4, height: 600, overflowY: 'scroll' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell />
                  {cvFormSchema.columns.map(column => (
                    <TableCell key={column.title} align="center">
                      {column.title}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {cvFormSchema.categories.map((category, index) => (
                  <CVFormCategoryRow key={category.id} category={category} readOnly={readOnly} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper sx={{ p: 4, mt: 2 }}>
            <Stack spacing={2}>
              <FormikTextField
                minRows={3}
                multiline
                InputProps={{ readOnly }}
                name="details"
                label="תיאור ההתרחשות"
              />
              <Divider />
              <Typography fontSize="1.25rem" fontWeight={700}>
                פרטי ממלא הטופס
              </Typography>
              <Stack direction="row" spacing={2}>
                <FormikTextField name="completedBy.name" label="שם" InputProps={{ readOnly }} />
                <FormikTextField name="completedBy.phone" label="טלפון" InputProps={{ readOnly }} />
                <FormikTextField
                  name="completedBy.affiliation"
                  label="תפקיד"
                  InputProps={{ readOnly }}
                />
              </Stack>
              <RoleAuthorizer user={user} allowedRoles={['judge-advisor']}>
                <Divider />
                <FormikTextField
                  minRows={3}
                  multiline
                  name="actionsTaken"
                  label="פעולות שננקטו"
                  color="warning"
                  autoFocus
                />
              </RoleAuthorizer>
            </Stack>
          </Paper>
          <Box display="flex" justifyContent="center">
            <Button
              variant="contained"
              sx={{ minWidth: 300, mt: 4 }}
              onClick={submitForm}
              disabled={!isValid || (initialCvForm && values === initialCvForm)}
            >
              הגשה
            </Button>
          </Box>
        </Form>
      )}
    </Formik>
  );
};

export default CVForm;
