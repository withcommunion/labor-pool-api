import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import {
  generateReturn,
  parseIdFromUrn,
  parseEntityTypeFromUrn,
} from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getAllEvents, Event } from 'src/util/dynamo-event';
import { batchGetUserByIds, IUser } from 'src/util/dynamo-user';
import { batchGetOrgByIds, IOrg } from 'src/util/dynamo-org';

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

    logger.verbose('Fetching all events', { values: { orgId } });
    const allEvents = (await getAllEvents()) as Event[];
    logger.info('Received events', { values: { allEvents } });

    /**
     * TODO:
     * We obviously want to put safeguards here
     * Pagination
     * Filtering mechanisms
     */

    if (!allEvents) {
      logger.error('events not found', {
        values: { orgId },
      });
      return generateReturn(404, { message: 'Events not found', orgId });
    }

    const ownerUrnsInAllEvents = allEvents.map((event) => event.ownerUrn);

    const userIdsInEvents = ownerUrnsInAllEvents
      .filter((ownerUrn) => parseEntityTypeFromUrn(ownerUrn) === 'user')
      .map((ownerUrn) => parseIdFromUrn(ownerUrn))
      .reduce((acc, curr) => {
        if (!acc.includes(curr)) {
          return [...acc, curr];
        } else {
          return acc;
        }
      }, [] as string[]);

    const orgIdsInEvents = ownerUrnsInAllEvents
      .filter((ownerUrn) => parseEntityTypeFromUrn(ownerUrn) === 'org')
      .map((ownerUrn) => parseIdFromUrn(ownerUrn))
      .reduce((acc, curr) => {
        if (!acc.includes(curr)) {
          return [...acc, curr];
        } else {
          return acc;
        }
      }, [] as string[]);

    const allUsersInEvents = await batchGetUserByIds(userIdsInEvents);
    const allOrgsInEvents = await batchGetOrgByIds(orgIdsInEvents);

    const urnToEntityMap = {} as Record<string, { org?: IOrg; user?: IUser }>;
    allUsersInEvents?.forEach((user) => {
      urnToEntityMap[`urn:user:${user.id}`] = { user };
    });
    allOrgsInEvents?.forEach((org) => {
      urnToEntityMap[`urn:org:${org.id}`] = { org };
    });

    const eventsWithOwnerEntity = allEvents.map((event) => {
      const ownerEntity = urnToEntityMap[event.ownerUrn];
      return { ...event, ownerEntity };
    });

    const returnValue = generateReturn(200, eventsWithOwnerEntity);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get all events', {
      values: { error },
    });
    console.error('Failed to get all events', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the events',
      error: error,
    });
  }
};
