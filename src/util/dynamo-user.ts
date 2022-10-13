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
  primaryOrgId: string;
  shiftHistory: string[];
  phoneNumber: string;
  allowSms: boolean;
  email: string;
  createdAtSecs: number;
  updatedAtSecs: number;
}

const schema = new dynamoose.Schema(
  {
    id: String,
    firstName: String,
    lastName: String,
    primaryOrgId: String,
    shiftHistory: {
      type: Set,
      schema: [String],
    },
    phoneNumber: String,
    email: String,
    allowSms: Boolean,
  },
  {
    timestamps: {
      createdAt: ['createdAtSecs'],
      updatedAt: ['updatedAtSecs'],
    },
  }
);

export const User = dynamoose.model<IUser>('labor-pool-usersTable-dev', schema);

/**
    // @ts-expect-error its ok
    await user.update({ id: userId }, { $ADD: { shiftHistory: ['asdf3'] } });
    */
