import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import {
  generateReturn,
  parseEntityTypeFromUrn,
  parseIdFromUrn,
} from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { getAllOrgs, IOrg } from 'src/util/dynamo-org';
import { getAllUsers, IUser } from 'src/util/dynamo-user';

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

    logger.verbose('Fetching all users that the entity follows', {
      values: { entityUrn },
    });
    const allUsersRaw = (await getAllUsers()) as IUser[];
    logger.info('Received all users', { values: { allUsersRaw } });

    logger.verbose('Fetching all orgs that the entity follows', {
      values: { entityUrn },
    });
    const allOrgsRaw = (await getAllOrgs()) as IOrg[];
    logger.info('Received all orgs', { values: { allOrgsRaw } });
    /**
     * TODO:
     * We obviously want to put safeguards here
     * to ensure that not everyone can see the users data
     */

    const allUsers = parseSelfFromUsers(entityUrn, allUsersRaw);
    const allOrgs = parseSelfFromOrgs(entityUrn, allOrgsRaw);

    const returnValue = generateReturn(200, {
      following: { users: allUsers, orgs: allOrgs },
      followers: { users: allUsers, orgs: allOrgs },
    });
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

function parseSelfFromUsers(entityUrn: string, users: IUser[]): IUser[] {
  logger.verbose('Parsing self from users', { values: { entityUrn, users } });
  const entityType = parseEntityTypeFromUrn(entityUrn);

  if (entityType === 'user') {
    const selfId = parseIdFromUrn(entityUrn);
    return users.filter((user) => user.id !== selfId);
  } else {
    return users;
  }
}

function parseSelfFromOrgs(entityUrn: string, orgs: IOrg[]): IOrg[] {
  logger.verbose('Parsing self from orgs', { values: { entityUrn, orgs } });
  const entityType = parseEntityTypeFromUrn(entityUrn);

  if (entityType === 'org') {
    const selfId = parseIdFromUrn(entityUrn);
    return orgs.filter((org) => org.id !== selfId);
  } else {
    return orgs;
  }
}
