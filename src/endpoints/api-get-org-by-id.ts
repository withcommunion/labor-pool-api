import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getOrgById } from 'src/util/dynamo-org';

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

    const orgId = event.pathParameters?.id || '';

    logger.verbose('Fetching Org', { values: { orgId } });
    const org = await getOrgById(orgId);
    logger.info('Received Org', { values: { org } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that the users in the org can see the org data
     */

    if (!org) {
      logger.error('Org not found', {
        values: { orgId },
      });
      return generateReturn(404, { message: 'Org not found', orgId });
    }

    const returnValue = generateReturn(200, {
      ...org,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get Org', {
      values: { error },
    });
    console.error('Failed to get org', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the Org',
      error: error,
    });
  }
};
