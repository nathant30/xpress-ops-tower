// Booking Repository
// Secure booking data operations with comprehensive validation and audit logging

import { database } from '@/lib/database';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { sanitizeInput, ValidationSchemas } from '@/lib/security/inputSanitizer';
import { z } from 'zod';

export interface Booking {
  id: string;
  passengerId: string;
  driverId: string | null;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  fare: number;
  paymentMethod: 'cash' | 'card' | 'wallet';
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  notes?: string;
  rating?: number;
  cancelledReason?: string;
}

const BookingCreateSchema = z.object({
  passengerId: ValidationSchemas.driverId,
  pickup: z.object({
    lat: ValidationSchemas.latitude,
    lng: ValidationSchemas.longitude,
    address: z.string().max(500)
  }),
  destination: z.object({
    lat: ValidationSchemas.latitude,
    lng: ValidationSchemas.longitude,
    address: z.string().max(500)
  }),
  fare: z.number().min(0).max(10000),
  paymentMethod: z.enum(['cash', 'card', 'wallet']),
  scheduledFor: z.string().optional(),
  notes: z.string().max(1000).optional()
});

const BookingUpdateSchema = z.object({
  status: z.enum(['requested', 'accepted', 'in_progress', 'completed', 'cancelled']).optional(),
  driverId: ValidationSchemas.driverId.optional(),
  fare: z.number().min(0).max(10000).optional(),
  rating: z.number().min(1).max(5).optional(),
  cancelledReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
});

export class BookingRepository {
  public async findById(id: string, userId?: string): Promise<Booking | null> {
    const validation = ValidationSchemas.bookingId.safeParse(id);
    if (!validation.success) {
      throw new Error('Invalid booking ID format');
    }

    const result = await database.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [id],
      { operation: 'find_booking', userId }
    );

    return result.rows[0] || null;
  }

  public async findByPassenger(passengerId: string, limit = 50, offset = 0, userId?: string): Promise<Booking[]> {
    const validation = ValidationSchemas.driverId.safeParse(passengerId);
    if (!validation.success) {
      throw new Error('Invalid passenger ID format');
    }

    const result = await database.query(
      `SELECT * FROM bookings 
       WHERE passenger_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [passengerId, limit, offset],
      { operation: 'find_bookings_by_passenger', userId }
    );

    return result.rows;
  }

  public async findByDriver(driverId: string, limit = 50, offset = 0, userId?: string): Promise<Booking[]> {
    const validation = ValidationSchemas.driverId.safeParse(driverId);
    if (!validation.success) {
      throw new Error('Invalid driver ID format');
    }

    const result = await database.query(
      `SELECT * FROM bookings 
       WHERE driver_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [driverId, limit, offset],
      { operation: 'find_bookings_by_driver', userId }
    );

    return result.rows;
  }

  public async findActiveBookings(regionId?: string, userId?: string): Promise<Booking[]> {
    let query = `
      SELECT b.*, d.current_location, d.vehicle_type 
      FROM bookings b
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE b.status IN ('requested', 'accepted', 'in_progress')
    `;
    
    const params: any[] = [];
    
    if (regionId) {
      const validation = ValidationSchemas.regionId.safeParse(regionId);
      if (!validation.success) {
        throw new Error('Invalid region ID format');
      }
      query += ` AND d.region_id = $1`;
      params.push(regionId);
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await database.query(
      query,
      params,
      { operation: 'find_active_bookings', userId }
    );

    return result.rows;
  }

  public async create(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>, userId?: string): Promise<Booking> {
    const validation = BookingCreateSchema.safeParse(bookingData);
    if (!validation.success) {
      throw new Error(`Invalid booking data: ${validation.error.message}`);
    }

    const sanitizedData = {
      ...validation.data,
      pickup: {
        ...validation.data.pickup,
        address: sanitizeInput(validation.data.pickup.address)
      },
      destination: {
        ...validation.data.destination,
        address: sanitizeInput(validation.data.destination.address)
      },
      notes: validation.data.notes ? sanitizeInput(validation.data.notes) : null
    };

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await database.query(
      `INSERT INTO bookings (
        id, passenger_id, pickup_lat, pickup_lng, pickup_address,
        destination_lat, destination_lng, destination_address,
        status, fare, payment_method, created_at, updated_at,
        scheduled_for, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *`,
      [
        id,
        sanitizedData.passengerId,
        sanitizedData.pickup.lat,
        sanitizedData.pickup.lng,
        sanitizedData.pickup.address,
        sanitizedData.destination.lat,
        sanitizedData.destination.lng,
        sanitizedData.destination.address,
        'requested',
        sanitizedData.fare,
        sanitizedData.paymentMethod,
        now,
        now,
        sanitizedData.scheduledFor || null,
        sanitizedData.notes
      ],
      { operation: 'create_booking', userId }
    );

    auditLogger.logEvent(
      AuditEventType.API_CALL,
      SecurityLevel.LOW,
      'SUCCESS',
      {
        operation: 'booking_created',
        bookingId: id,
        passengerId: sanitizedData.passengerId,
        fare: sanitizedData.fare
      },
      { userId, resource: 'booking', action: 'create' }
    );

    return result.rows[0];
  }

  public async update(id: string, updates: Partial<Booking>, userId?: string): Promise<Booking> {
    const idValidation = ValidationSchemas.bookingId.safeParse(id);
    if (!idValidation.success) {
      throw new Error('Invalid booking ID format');
    }

    const validation = BookingUpdateSchema.safeParse(updates);
    if (!validation.success) {
      throw new Error(`Invalid update data: ${validation.error.message}`);
    }

    const sanitizedUpdates = {
      ...validation.data,
      cancelledReason: validation.data.cancelledReason ? sanitizeInput(validation.data.cancelledReason) : undefined,
      notes: validation.data.notes ? sanitizeInput(validation.data.notes) : undefined
    };

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.entries(sanitizedUpdates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const result = await database.query(
      `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = $${paramIndex + 1} RETURNING *`,
      updateValues,
      { operation: 'update_booking', userId }
    );

    if (result.rowCount === 0) {
      throw new Error('Booking not found');
    }

    auditLogger.logEvent(
      AuditEventType.API_CALL,
      SecurityLevel.LOW,
      'SUCCESS',
      {
        operation: 'booking_updated',
        bookingId: id,
        updatedFields: Object.keys(sanitizedUpdates)
      },
      { userId, resource: 'booking', action: 'update' }
    );

    return result.rows[0];
  }

  public async assignDriver(bookingId: string, driverId: string, userId?: string): Promise<void> {
    const bookingValidation = ValidationSchemas.bookingId.safeParse(bookingId);
    const driverValidation = ValidationSchemas.driverId.safeParse(driverId);
    
    if (!bookingValidation.success || !driverValidation.success) {
      throw new Error('Invalid booking or driver ID format');
    }

    await database.transaction([
      {
        text: `UPDATE bookings SET driver_id = $1, status = 'accepted', updated_at = $2 WHERE id = $3 AND status = 'requested'`,
        params: [driverId, new Date().toISOString(), bookingId],
        operation: 'assign_driver_booking'
      },
      {
        text: `UPDATE drivers SET status = 'busy', updated_at = $1 WHERE id = $2`,
        params: [new Date().toISOString(), driverId],
        operation: 'assign_driver_status'
      }
    ], userId);

    auditLogger.logEvent(
      AuditEventType.API_CALL,
      SecurityLevel.LOW,
      'SUCCESS',
      {
        operation: 'driver_assigned',
        bookingId,
        driverId
      },
      { userId, resource: 'booking', action: 'assign_driver' }
    );
  }

  public async cancel(bookingId: string, reason: string, userId?: string): Promise<void> {
    const validation = ValidationSchemas.bookingId.safeParse(bookingId);
    if (!validation.success) {
      throw new Error('Invalid booking ID format');
    }

    const sanitizedReason = sanitizeInput(reason);
    
    const result = await database.query(
      `UPDATE bookings 
       SET status = 'cancelled', cancelled_reason = $1, updated_at = $2 
       WHERE id = $3 AND status NOT IN ('completed', 'cancelled')
       RETURNING driver_id`,
      [sanitizedReason, new Date().toISOString(), bookingId],
      { operation: 'cancel_booking', userId }
    );

    if (result.rowCount === 0) {
      throw new Error('Booking not found or cannot be cancelled');
    }

    if (result.rows[0].driver_id) {
      await database.query(
        `UPDATE drivers SET status = 'available', updated_at = $1 WHERE id = $2`,
        [new Date().toISOString(), result.rows[0].driver_id],
        { operation: 'release_driver', userId }
      );
    }

    auditLogger.logEvent(
      AuditEventType.API_CALL,
      SecurityLevel.LOW,
      'SUCCESS',
      {
        operation: 'booking_cancelled',
        bookingId,
        reason: sanitizedReason
      },
      { userId, resource: 'booking', action: 'cancel' }
    );
  }

  public async complete(bookingId: string, rating?: number, userId?: string): Promise<void> {
    const validation = ValidationSchemas.bookingId.safeParse(bookingId);
    if (!validation.success) {
      throw new Error('Invalid booking ID format');
    }

    if (rating && (rating < 1 || rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    await database.transaction([
      {
        text: `UPDATE bookings 
               SET status = 'completed', rating = $1, updated_at = $2 
               WHERE id = $3 AND status = 'in_progress'`,
        params: [rating || null, new Date().toISOString(), bookingId],
        operation: 'complete_booking'
      },
      {
        text: `UPDATE drivers 
               SET status = 'available', updated_at = $1 
               WHERE id = (SELECT driver_id FROM bookings WHERE id = $2)`,
        params: [new Date().toISOString(), bookingId],
        operation: 'complete_booking_driver'
      }
    ], userId);

    auditLogger.logEvent(
      AuditEventType.API_CALL,
      SecurityLevel.LOW,
      'SUCCESS',
      {
        operation: 'booking_completed',
        bookingId,
        rating: rating || null
      },
      { userId, resource: 'booking', action: 'complete' }
    );
  }

  public async getBookingStats(regionId?: string, startDate?: string, endDate?: string, userId?: string) {
    let query = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        AVG(CASE WHEN status = 'completed' THEN fare END) as average_fare,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as average_rating
      FROM bookings b
    `;

    const params: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (regionId) {
      const validation = ValidationSchemas.regionId.safeParse(regionId);
      if (!validation.success) {
        throw new Error('Invalid region ID format');
      }
      query += ` LEFT JOIN drivers d ON b.driver_id = d.id`;
      conditions.push(`d.region_id = $${paramIndex}`);
      params.push(regionId);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`b.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`b.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await database.query(
      query,
      params,
      { operation: 'get_booking_stats', userId }
    );

    return result.rows[0];
  }
}

export const bookingRepository = new BookingRepository();
export default bookingRepository;