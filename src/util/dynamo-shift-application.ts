import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import { nanoid } from 'nanoid';

export interface ShiftApplication {
  id: string;
  shiftId: string;
  orgId: string;
  userId: string;
  description: string;
  ownerUrn: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface IShiftApplication extends Item, ShiftApplication {
  createdAtMs: number;
  updatedAtMs: number;
}

const schema = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: nanoid(),
    },
    ownerUrn: String,
    shiftId: String,
    orgId: String,
    userId: String,
    description: String,
    status: {
      type: String,
      default: 'pending',
    },
  },
  {
    timestamps: {
      createdAt: ['createdAtMs'],
      updatedAt: ['updatedAtMs'],
    },
  }
);

const tableStage = process.env.STAGE === 'prod' ? 'prod' : 'dev';
export const ShiftApplication = dynamoose.model<IShiftApplication>(
  `labor-pool-shiftApplicationsTable-${tableStage}`,
  schema
);

export async function getApplicationById(id: string) {
  try {
    const shiftApplication = await ShiftApplication.get(id, {});
    return shiftApplication;
  } catch (error) {
    console.log('Failed to shiftApplication', error);
    return null;
  }
}

export async function createApplication(shift: ShiftApplication) {
  try {
    /**
     * TODO: Follow this pattern elsewhere
     * Enables more insight into what is going in DB
     * And overwrites on save
     */
    const application = new ShiftApplication(shift);
    console.log('Saving Application', { application });
    const savedApplication = await application.save();
    return savedApplication;
  } catch (error) {
    console.log('Failed to createApplication', error);
    return null;
  }
}

export async function deleteApplication(shiftApplicationId: string) {
  try {
    await ShiftApplication.delete(shiftApplicationId);

    return true;
  } catch (error) {
    console.log('Failed to deleteApplication', error);
    return false;
  }
}

export async function getShiftApplicationsByOrgId(orgId: string) {
  try {
    const shiftApplications = await ShiftApplication.scan('orgId')
      .contains(orgId)
      .exec();
    return shiftApplications.toJSON();
  } catch (error) {
    console.log('Failed to getShiftApplicationsByOrgId', error);
    return null;
  }
}

export async function getShiftApplicationsByShiftId(shiftId: string) {
  try {
    const shiftApplications = await ShiftApplication.scan('shiftId')
      .contains(shiftId)
      .exec();
    return shiftApplications.toJSON() as ShiftApplication[];
  } catch (error) {
    console.log('Failed to getShiftApplicationsByShiftId', error);
    return null;
  }
}

export async function getShiftApplicationsByUserId(userId: string) {
  try {
    const shiftApplications = await ShiftApplication.scan('userId')
      .contains(userId)
      .exec();
    return shiftApplications.toJSON();
  } catch (error) {
    console.log('Failed to getShiftApplicationsByUserId', error);
    return null;
  }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'accepted' | 'rejected'
) {
  try {
    const updatedOrg = await ShiftApplication.update(
      { id: applicationId },
      { status: status }
    );

    return updatedOrg;
  } catch (error) {
    console.log('Failed to addMemberToOrg', error);
    return null;
  }
}
