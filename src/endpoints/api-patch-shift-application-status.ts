import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import {
  updateApplicationStatus,
  getApplicationById,
  getShiftApplicationsByShiftId,
} from '../util/dynamo-shift-application';
import { applyUserToShift, getShiftById } from 'src/util/dynamo-shift';

interface ExpectedPatchBody {
  status: 'accepted' | 'rejected';
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  try {
    setDefaultLoggerMetaForApi(event, logger);

    logger.info('incomingEvent', { values: { event } });
    logger.verbose('incomingEventAuth', {
      values: { authorizer: event.requestContext.authorizer },
    });

    const applicationId = event.pathParameters?.id;

    /**
     * TODO: We will obviously want to put guards here
     * Ensure that shift exists
     * Ensure that org exists
     * Ensure that user exists
     * Only users who have access to the shift can apply
     */

    /**
    const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    const requestingUserId =
      claims &&
      ((claims.username as string) || (claims['cognito:username'] as string));
    */

    if (!applicationId) {
      return generateReturn(500, {
        message:
          'Shift application id not provided not provided in request path',
        pathParams: event.pathParameters,
      });
    }

    const applicationStatus = parseBody(event.body || '');
    if (!applicationStatus) {
      return generateReturn(500, {
        message: 'Failed to parse shift application status from body',
        body: event.body,
        requiredFields: ['status'],
      });
    }

    if (applicationStatus !== 'accepted' && applicationStatus !== 'rejected') {
      return generateReturn(400, {
        message: 'Invalid shift application status',
        availableStatuses: ['accepted', 'rejected'],
        providedStatus: applicationStatus,
      });
    }

    const shiftApplication = await getApplicationById(applicationId);
    if (!shiftApplication) {
      return generateReturn(404, {
        message: 'Shift application not found',
        applicationId,
      });
    }

    const shiftBeingAppliedTo = await getShiftById(shiftApplication.shiftId);
    if (!shiftBeingAppliedTo) {
      return generateReturn(404, {
        message: 'Shift being applied to not found',
        shiftId: shiftApplication.shiftId,
      });
    }

    logger.verbose('Updating ShiftApplication status', {
      values: { applicationStatus, applicationId },
    });
    const updatedApplication = await updateApplicationStatus(
      applicationId,
      applicationStatus
    );

    if (!updatedApplication) {
      logger.info('Failed to update application status', {
        values: { updatedApplication, applicationId, applicationStatus },
      });
      return generateReturn(500, {
        message: 'Failed to update application status',
        updatedApplication,
        applicationId,
        applicationStatus,
      });
    }
    logger.info('Updated ShiftApplication status', {
      values: { updatedApplication },
    });

    const otherShiftApplications = (
      await getShiftApplicationsByShiftId(shiftApplication.shiftId)
    )?.filter((app) => app.id !== applicationId);
    if (otherShiftApplications) {
      try {
        await Promise.all(
          otherShiftApplications?.map((application) => {
            // eslint-disable-next-line
            updateApplicationStatus(application.id, 'rejected');
          })
        );
      } catch (error) {
        logger.error('Failed to reject other shift applications', {
          values: { error, otherShiftApplications },
        });
        console.error('Failed to reject other shift applications', error);

        return generateReturn(500, {
          message: 'Failed to reject other shift applications',
          error,
          otherShiftApplications,
        });
      }
    }

    try {
      logger.info('Updating shift with accepted application', {
        values: { shiftApplication },
      });
      await applyUserToShift(
        shiftApplication.shiftId,
        shiftApplication.userId,
        'filled'
      );
    } catch (error) {
      console.error('Failed to update shift with accepted application', error);
      return generateReturn(500, {
        message: 'Failed to updated shift to filled',
        error,
        shiftId: shiftApplication.shiftId,
      });
    }

    const returnValue = generateReturn(200, {
      ...updatedApplication,
    });
    logger.info('Returning', { values: returnValue });

    /**
     * TODO notify the org that an application was updated
     * TODO notify the user that their application was updated
     * TODO Update shift status if application is accepted
     */

    return returnValue;
  } catch (error) {
    logger.error('Failed to create update Application status', {
      values: { error },
    });
    console.error('Failed to update Application status', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to update the Shift Applcation Status, please try again.',
      error: error,
    });
  }
};

function parseBody(bodyString: string) {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPatchBody;

    const status = body.status;

    return status;
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return null;
  }
}
