import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import {
  createApplication,
  ShiftApplication,
} from '../util/dynamo-shift-application';

interface ExpectedPostBody {
  orgId: string;
  userId: string;
  description: string;
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

    const shiftId = event.pathParameters?.id;

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

    if (!shiftId) {
      return generateReturn(500, {
        message: 'Shift ID not provided not provided in request path',
        pathParams: event.pathParameters,
      });
    }

    const shiftApplication = parseBody(event.body || '');
    if (!shiftApplication) {
      return generateReturn(500, {
        message: 'Failed to parse shift application from body',
        body: event.body,
        requiredFields: ['shiftId', 'orgId', 'userId', 'description'],
      });
    }

    const fullShift = {
      ...shiftApplication,
      shiftId,
    } as ShiftApplication;

    logger.verbose('Creating ShiftApplication', { values: { fullShift } });
    const savedApplication = await createApplication(fullShift);
    if (!savedApplication) {
      logger.info('Failed to save org', { values: { savedApplication } });
      return generateReturn(500, {
        message: 'Failed to save org',
        fullShift,
      });
    }
    logger.info('Created ShiftApplication', { values: { savedApplication } });

    const returnValue = generateReturn(200, {
      ...savedApplication,
    });
    logger.info('Returning', { values: returnValue });

    /**
     * TODO notify the org that a new application has been made
     */

    return returnValue;
  } catch (error) {
    logger.error('Failed to create Shift Application', {
      values: { error },
    });
    console.error('Failed to Shift Application', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to save the Shift Applcation, please try again.',
      error: error,
    });
  }
};

function parseBody(bodyString: string) {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPostBody;

    const orgId = body.orgId;
    const userId = body.userId;
    const description = body.description;

    const application = {
      orgId,
      userId,
      description,
    };

    return application;
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return null;
  }
}
