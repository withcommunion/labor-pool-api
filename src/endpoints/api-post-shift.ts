import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { getTime } from 'date-fns';

import { generateReturn } from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import { createShift, IShift } from 'src/util/dynamo-shift';
import { getOrgById } from 'src/util/dynamo-org';

interface ExpectedPostBody {
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  description?: string;
  orgId?: string;
  status?: string;
  assignedTo?: string;
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

    /**
     * TODO: Ensure that requesting user is manager in org
    // For some reason it can come through in two seperate ways
       */
    const claims = event.requestContext.authorizer?.jwt?.claims;
    const requestUserId =
      claims &&
      ((claims.username as string) || (claims['cognito:username'] as string));

    const parsedShift = parseBody(event.body || '');
    if (
      !parsedShift ||
      !parsedShift.name ||
      !parsedShift.startTimeMs ||
      !parsedShift.endTimeMs
    ) {
      return generateReturn(500, {
        message: 'You are missing some required fields',
        body: event.body,
        parsedBody: parsedShift,
        requiredFields: ['name', 'beginDate', 'endDate'],
      });
    }

    const ownerUrn = parsedShift.orgId
      ? `urn:org:${parsedShift.orgId}`
      : `urn:user:${requestUserId}`;

    logger.verbose('Fetching org', { values: { orgId: parsedShift.orgId } });
    const org = await getOrgById(parsedShift.orgId);
    if (parsedShift.orgId && !org) {
      return generateReturn(404, {
        message: 'Org not found',
        orgId: parsedShift.orgId,
      });
    }

    const shift = { ...parsedShift, ownerUrn } as IShift;

    logger.verbose('Creating shift', { values: { shift } });
    const savedShift = await createShift(shift);
    if (!savedShift) {
      logger.info('Failed to save shift', { values: { savedShift } });
      return generateReturn(500, {
        message: 'Failed to save shif',
        shift,
      });
    }
    logger.info('Created shift', { values: { savedShift } });

    const returnValue = generateReturn(200, {
      ...savedShift,
    });
    logger.info('Returning', { values: returnValue });

    return returnValue;
  } catch (error) {
    logger.error('Failed to create shift', {
      values: { error },
    });
    console.error('Failed to create shift', error);
    return generateReturn(500, {
      message:
        'Something went wrong trying to save the shift, please try again.',
      error: error,
    });
  }
};

function parseBody(bodyString: string) {
  try {
    const body = JSON.parse(bodyString || '') as ExpectedPostBody;

    const shift = {
      orgId: body.orgId,
      name: body.name,
      status: body.status || 'open',
      description: body.description,
      location: body.location,
      assignedTo: [body.assignedTo],
      startTimeMs: getTime(new Date(body.startDate.trim())),
      endTimeMs: getTime(new Date(body.endDate.trim())),
      startDateIso: body.startDate,
      endDateIso: body.endDate,
    } as IShift;

    return shift;
  } catch (error) {
    logger.error('Failed to parse body', {
      values: { error, body: bodyString },
    });
    console.log('Failed to parse body', error);
    return null;
  }
}
