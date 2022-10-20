/**
 * Schema
 * Model
 * Use it
 */
import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';

// Strongly typed model
interface IUser extends Item {
  id: string;
  firstName: string;
  lastName: string;
  orgs: string[];
  orgRoles: { orgId: string; role: string }[];
  shiftHistory: string[];
  phoneNumber: string;
  allowSms: boolean;
  email: string;
  createdAtMs: number;
  updatedAtMs: number;
}

const schema = new dynamoose.Schema(
  {
    id: String,
    firstName: String,
    lastName: String,
    orgs: {
      type: Array,
      schema: [String],
      default: [],
    },
    orgRoles: {
      type: Array,
      schema: [Object],
      default: [],
    },
    shiftHistory: {
      type: Array,
      schema: [String],
      default: [],
    },
    phoneNumber: String,
    email: String,
    allowSms: Boolean,
  },
  {
    timestamps: {
      createdAt: ['createdAtMs'],
      updatedAt: ['updatedAtMs'],
    },
    saveUnknown: true,
  }
);

const tableStage = process.env.STAGE === 'prod' ? 'prod' : 'dev';
export const User = dynamoose.model<IUser>(
  `labor-pool-usersTable-${tableStage}`,
  schema
);

export async function getUserById(id: string) {
  try {
    const user = await User.get(id);
    return user;
  } catch (error) {
    console.log('Failed to getUserById', error);
    return null;
  }
}

export async function createUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  primaryOrgId: string;
  phoneNumber: string;
  allowSms: boolean;
  email: string;
  shiftHistory?: string[];
}) {
  try {
    const newUser = await User.create(user);
    return newUser;
  } catch (error) {
    console.log('Failed to createUser', error);
    return null;
  }
}

export async function addOrgToUser(
  userId: string,
  orgId: string,
  role?: 'manager' | 'employee'
) {
  try {
    const roleToAdd = role ? role : 'employee';
    const updatedUser = await User.update(
      { id: userId },
      {
        // @ts-expect-error this is a dynamoose TS bug
        $ADD: {
          orgs: [orgId],
          orgRoles: [{ orgId, role: roleToAdd }],
        },
      }
    );
    return updatedUser;
  } catch (error) {
    console.log('Failed to addOrgToUser', error);
    return null;
  }
}

export async function addShiftToUser(userId: string, shiftId: string) {
  try {
    const updatedUser = await User.update(
      { id: userId },
      // @ts-expect-error this is a dynamoose TS bug
      { $ADD: { shiftHistory: [shiftId] } }
    );
    return updatedUser;
  } catch (error) {
    console.log('Failed to addShiftToUser', error);
    return null;
  }
}
