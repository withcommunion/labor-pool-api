import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import {
  generateReturn,
  parseEntityTypeFromUrn,
  parseIdFromUrn,
} from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getShiftApplicationsByShiftId } from 'src/util/dynamo-shift-application';
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
    const ownerUrnsInAllEvents = shiftApplications.map(
      (shift) => shift.ownerUrn
    );

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

    const applicationsWithOwnerEntity = shiftApplications.map((shift) => {
      const ownerEntity = urnToEntityMap[shift.ownerUrn];
      return { ...shift, ownerEntity };
    });

    const returnValue = generateReturn(200, applicationsWithOwnerEntity);
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
