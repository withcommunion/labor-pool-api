import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import {
  generateReturn,
  parseEntityTypeFromUrn,
  parseIdFromUrn,
} from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getAllShifts, IShift } from 'src/util/dynamo-shift';
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

    logger.verbose('Fetching all shifts', { values: { orgId } });
    const allShifts = (await getAllShifts()) as IShift[];
    logger.info('Received shifts', { values: { allShifts } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * Pagination
     * Filtering mechanisms
     */

    if (!allShifts) {
      logger.error('Shifts not found', {
        values: { orgId },
      });
      return generateReturn(404, { message: 'Shifts not found', orgId });
    }

    const ownerUrnsInAllEvents = allShifts.map((shift) => shift.ownerUrn);

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

    const shiftsWithOwnerEntity = allShifts.map((shift) => {
      const ownerEntity = urnToEntityMap[shift.ownerUrn];
      return { ...shift, ownerEntity };
    });

    const returnValue = generateReturn(200, shiftsWithOwnerEntity);
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to get all shifts', {
      values: { error },
    });
    console.error('Failed to get all shifts', error);
    return generateReturn(500, {
      message: 'Something went wrong trying to fetch the shifts',
      error: error,
    });
  }
};
