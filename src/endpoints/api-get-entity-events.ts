import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getEventsByOwnerUrn } from 'src/util/dynamo-event';

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

    const entityUrn = event.pathParameters?.urn || '';
    if (!entityUrn) {
      logger.error('No urn provided', {
        values: { pathParams: event.pathParameters },
      });
      return generateReturn(400, {
        message: 'No urn provided in path',
        entityUrn,
      });
    }

    logger.verbose('Fetching all entities events', {
      values: { entityUrn },
    });
    const allEntityEvents = await getEventsByOwnerUrn(entityUrn);
    logger.info('Received entities', { values: { allEntityEvents } });

    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that not everyone can see the users data
     */

    const returnValue = generateReturn(200, allEntityEvents);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get shifts for user', {
      values: { error },
    });
    console.error('Failed to get shifts for user', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the shifts for user',
      error: error,
    });
  }
};
