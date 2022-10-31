import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getShiftApplicationsByShiftId } from 'src/util/dynamo-shift-application';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
) => {
  try {
    setDefaultLoggerMetaForApi(event, logger);

    logger.info('incomingEvent', { values: { event } });
    logger.verbose('incomingEventAuth', {
      values: { authorizer: event.requestContext.authorizer },
    });

    // const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    // const requestingUserId =
    //   claims &&
    //   ((claims.username as string) || (claims['cognito:username'] as string));

    const shiftId = event.pathParameters?.id || '';

    logger.verbose('Fetching shifts applications', { values: { shiftId } });
    const shiftApplications = await getShiftApplicationsByShiftId(shiftId);
    logger.info('Received shifts', { values: { shiftApplications } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that the users in the org can see the shift data
     */

    if (!shiftApplications) {
      logger.error('No Applications found for shift', {
        values: { shiftId },
      });
      return generateReturn(404, { message: 'Shifts not found', shiftId });
    }

    // @ts-expect-error it's okay to return the whole object
    const returnValue = generateReturn(200, shiftApplications);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get shift applications for shift', {
      values: { error },
    });
    console.error('Failed to get shift applications for shift', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to fetch the shift applications for shift',
      error: error,
    });
  }
};
