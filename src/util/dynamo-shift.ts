import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import { IOrg } from './dynamo-org';
import { IUser } from './dynamo-user';
import { generateUrlFriendlyId } from './dynamo-util';

// Strongly typed model
export interface IShift extends Item {
  id: string;
  name: string;
  orgId: string;
  ownerUrn: string;
  status: 'open' | 'broadcasting' | 'applied' | 'filled' | 'expired';
  location: string;
  description: string;
  assignedTo: string[];
  ownerEntity?: {
    user?: IUser;
    org?: IOrg;
  };
  startTimeMs: number;
  endTimeMs: number;
  startDateIso: string;
  endDateIso: string;
  createdAtMs: number;
  updatedAtMs: number;
}

const schema = new dynamoose.Schema(
  {
    id: {
      type: String,
      default: generateUrlFriendlyId(20),
    },
    name: String,
    orgId: String,
    ownerUrn: String,
    status: {
      type: String,
      default: 'open',
    },
    description: String,
    location: String,
    assignedTo: {
      type: Array,
      default: [],
    },
    beginDate: String,
    endDate: String,
  },
  {
    timestamps: {
      createdAt: {
        createdAtMs: {
          type: {
            value: Number,
            settings: {
              storage: 'milliseconds',
            },
          },
        },
      },
      updatedAt: {
        updatedAtMs: {
          type: {
            value: Number,
            settings: {
              storage: 'milliseconds',
            },
          },
        },
      },
    },
    saveUnknown: true,
  }
);

const tableStage = process.env.STAGE === 'prod' ? 'prod' : 'dev';
export const Shift = dynamoose.model<IShift>(
  `labor-pool-shiftsTable-${tableStage}`,
  schema
);

export async function getShiftById(id: string) {
  try {
    const shift = await Shift.get(id);
    return shift;
  } catch (error) {
    console.log('Failed to getShiftById', error);
    return null;
  }
}

export async function deleteShiftById(id: string) {
  try {
    await Shift.delete(id);
    return true;
  } catch (error) {
    console.log('Failed to deleteShift', error);
    return false;
  }
}

export async function getOrgShifts(orgId: string) {
  try {
    const shifts = await Shift.scan('ownerUrn').contains(orgId).exec();
    return shifts.toJSON();
  } catch (error) {
    console.log('Failed to getOrgShifts', error);
    return null;
  }
}

export async function getAllShifts() {
  try {
    const shifts = await Shift.scan().exec();
    return shifts.toJSON();
  } catch (error) {
    console.log('Failed to getAllShifts', error);
    return null;
  }
}

export async function getShiftsAssociatedWithUrn(urn: string) {
  try {
    const shiftsAssignedTo = await Shift.scan('assignedTo')
      .contains(urn)
      .exec();
    const shiftsCreated = await Shift.scan('ownerUrn').contains(urn).exec();

    const allUserShifts = [...shiftsAssignedTo, ...shiftsCreated].map(
      (shiftItem) => shiftItem
    );

    return allUserShifts;
  } catch (error) {
    console.log('Failed to getUserShifts', error);
    return null;
  }
}

export async function getUserShifts(userId: string) {
  try {
    const shiftsAssignedTo = await Shift.scan('assignedTo')
      .contains(`urn:user:${userId}`)
      .exec();
    const shiftsCreated = await Shift.scan('ownerUrn').contains(userId).exec();

    const allUserShifts = [...shiftsAssignedTo, ...shiftsCreated].map(
      (shiftItem) => shiftItem
    );

    return allUserShifts;
  } catch (error) {
    console.log('Failed to getUserShifts', error);
    return null;
  }
}

export async function createShift(shift: IShift) {
  try {
    const newShift = new Shift(shift);
    console.log('createShift', { newShift });
    const savedShift = await newShift.save();
    return savedShift;
  } catch (error) {
    console.log('Failed to createShift', error);
    return null;
  }
}

export async function updateShift(id: string, shift: Partial<IShift>) {
  try {
    const updatedShift = await Shift.update(id, shift);
    return updatedShift;
  } catch (error) {
    console.log('Failed to updateShift', error);
    return null;
  }
}

export async function addUserToShift(shiftId: string, userId: string) {
  try {
    const updatedShift = await Shift.update(
      {
        id: shiftId,
      },
      {
        // @ts-expect-error its ok
        $ADD: { assignedTo: userId },
      }
    );
    return updatedShift;
  } catch (error) {
    console.log('Failed to addUserToShift', error);
    return null;
  }
}

export async function applyUserToShift(
  shiftId: string,
  userId: string,
  status: IShift['status']
) {
  try {
    const updatedShift = await Shift.update(
      {
        id: shiftId,
        status: status,
      },
      {
        // @ts-expect-error its ok
        $ADD: { assignedTo: userId },
      }
    );
    return updatedShift;
  } catch (error) {
    console.log('Failed to applyUserToShift', error);
    return null;
  }
}
