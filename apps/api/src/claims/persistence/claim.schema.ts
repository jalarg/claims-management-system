import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

import { ClaimStatus, DamageSeverity } from '../domain';
import type { ClaimStatusValue, DamageSeverityValue } from '../domain';

@Schema({ _id: false })
export class DamageDocument {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  part!: string;

  @Prop({ required: true, enum: Object.values(DamageSeverity) })
  severity!: DamageSeverityValue;

  @Prop({ required: true })
  imageUrl!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 1, max: 10 })
  score!: number;
}

export const DamageSchema = SchemaFactory.createForClass(DamageDocument);

@Schema({ collection: 'claims', timestamps: true })
export class ClaimDocument {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, enum: Object.values(ClaimStatus), default: ClaimStatus.Pending })
  status!: ClaimStatusValue;

  @Prop({ required: true, default: 0, min: 0 })
  totalAmount!: number;

  @Prop({ type: [DamageSchema], default: [] })
  damages!: DamageDocument[];

  createdAt!: Date;

  updatedAt!: Date;
}

export type ClaimHydratedDocument = HydratedDocument<ClaimDocument> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ClaimSchema = SchemaFactory.createForClass(ClaimDocument);
