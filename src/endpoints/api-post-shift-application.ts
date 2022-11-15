import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import {
  generateReturn,
  parseEntityTypeFromUrn,
  parseIdFromUrn,
} from '../util/api-util';
import logger, {
  setDefaultLoggerMetaForApi,
} from '../util/winston-logger-util';

import {
  createApplication,
  ShiftApplication,
} from '../util/dynamo-shift-application';
import { getShiftById } from 'src/util/dynamo-shift';
import { getUserById, IUser } from 'src/util/dynamo-user';
import { getOrgById, IOrg } from 'src/util/dynamo-org';
import { sendSms } from 'src/util/twilio-util';

interface ExpectedPostBody {
  ownerUrn: string;
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
     * Ensure that org exists
     * Ensure that user exists
     * Only users who have access to the shift can apply
     */

    // const claims = event.requestContext.authorizer?.jwt?.claims;
    // For some reason it can come through in two seperate ways
    // const requestUserId =
    //   claims &&
    //   ((claims.username as string) || (claims['cognito:username'] as string));

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

    const shiftBeingAppliedTo = await getShiftById(shiftId);
    if (!shiftBeingAppliedTo) {
      return generateReturn(404, {
        message: 'Shift being applied to not found',
        shiftId,
      });
    }

    const fullShift = {
      ...shiftApplication,
      shiftId,
    } as ShiftApplication;

    logger.verbose('Creating ShiftApplication', { values: { fullShift } });
    const savedApplication = await createApplication(fullShift);
    if (!savedApplication) {
      logger.info('Failed to save shift application', {
        values: { savedApplication },
      });
      return generateReturn(500, {
        message: 'Failed to save shift application',
        fullShift,
      });
    }
    logger.info('Created ShiftApplication', { values: { savedApplication } });

    await notifyUserHelper(savedApplication.toJSON() as ShiftApplication);

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

    const description = body.description;
    const ownerUrn = body.ownerUrn;

    const application = {
      ownerUrn,
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

async function notifyUserHelper(shiftApplication: ShiftApplication) {
  const applicantOwnerType = parseEntityTypeFromUrn(shiftApplication.ownerUrn);
  const applicantOwnerId = parseIdFromUrn(shiftApplication.ownerUrn);

  const applicantEntity =
    applicantOwnerType === 'user'
      ? await getUserById(applicantOwnerId)
      : await getOrgById(applicantOwnerId);
  if (!applicantEntity) {
    return;
  }

  const applicantName =
    applicantOwnerType === 'user'
      ? `${(applicantEntity as IUser).firstName} ${
          (applicantEntity as IUser).lastName
        }`
      : (applicantEntity as IOrg).name;
  const applicantUrl =
    applicantOwnerType === 'user'
      ? `https://www.communion.nyc/user/${applicantEntity?.id}`
      : `https://www.communion.nyc/org/${applicantEntity?.id}`;

  const shift = await getShiftById(shiftApplication.shiftId);
  if (!shift) {
    return;
  }

  const shiftOwnerType = parseEntityTypeFromUrn(shift?.ownerUrn || '');
  const shiftOwnerId = parseIdFromUrn(shift?.ownerUrn || '');
  const shiftOwnerEntity =
    shiftOwnerType === 'user'
      ? await getUserById(shiftOwnerId)
      : await getOrgById(shiftOwnerId);
  if (!shiftOwnerEntity) {
    return;
  }

  const shiftOwnerName =
    shiftOwnerType === 'user'
      ? `${(shiftOwnerEntity as IUser).firstName}`
      : (shiftOwnerEntity as IOrg).name;

  const message = `Hey ${shiftOwnerName}, you have a new application for your shift!
Here are the details:
  - Shift name: ${shift?.name || ''}

  - Applicant name: ${applicantName}
  - Applicant description: ${shiftApplication.description}

Visit ${applicantUrl} to find the applicants contact info and reach out directly if you have any questions.
      `;

  await sendSms(shiftOwnerEntity.phoneNumber, message);
}
