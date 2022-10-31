import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import { nanoid } from 'nanoid';

export interface ShiftApplication {
  id: string;
  shiftId: string;
  orgId: string;
  userId: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface IShiftApplication extends Item, ShiftApplication {
  id: string;
  shiftId: string;
  orgId: string;
  userId: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAtMs: number;
  updatedAtMs: number;
}

const schema = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: nanoid(),
    },
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
    const savedApplication = await ShiftApplication.create(shift);
    return savedApplication;
  } catch (error) {
    console.log('Failed to createApplication', error);
    return null;
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
    return shiftApplications.toJSON();
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
