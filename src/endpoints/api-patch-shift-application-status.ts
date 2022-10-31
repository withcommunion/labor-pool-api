import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { updateApplicationStatus } from '../util/dynamo-shift-application';

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

    const returnValue = generateReturn(200, {
      ...updatedApplication,
    });
    logger.info('Returning', { values: returnValue });

    /**
     * TODO notify the org that an application was updated
     * TODO notify the user that their application was updated
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
