import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { Platform } from '../../../shared/enums/platform.enum';

export { Platform };

@Entity('user_preferences')
export class UserPreferencesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sales_update_frequency', type: 'int', default: 1 })
  salesUpdateFrequency!: number;

  @Column({ name: 'wishlist_update_frequency', type: 'int', default: 1 })
  wishlistUpdateFrequency!: number;

  @Column({ name: 'sales_update_received_at', type: 'timestamp', nullable: true })
  salesUpdateReceivedAt?: Date | null;

  @Column({ name: 'wishlist_update_received_at', type: 'timestamp', nullable: true })
  wishlistUpdateReceivedAt?: Date | null;

  @Column({
    type: 'enum',
    enum: Platform,
    array: true,
    default: [Platform.PC, Platform.MAC, Platform.STEAM_DECK],
  })
  platform!: Platform[];

  @OneToOne(() => UserEntity, (user) => user.preferences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
