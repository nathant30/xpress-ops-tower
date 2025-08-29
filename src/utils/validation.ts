export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationRule {
  field: string;
  rules: {
    required?: boolean;
    email?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
    customMessage?: string;
  };
}

export class FormValidator {
  private rules: ValidationRule[] = [];

  constructor(rules: ValidationRule[] = []) {
    this.rules = rules;
  }

  addRule(rule: ValidationRule): FormValidator {
    this.rules.push(rule);
    return this;
  }

  validate(data: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of this.rules) {
      const value = data[rule.field];
      const fieldErrors = this.validateField(rule.field, value, rule.rules);
      errors.push(...fieldErrors);
    }

    return errors;
  }

  validateField(field: string, value: any, rules: ValidationRule['rules']): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: `${this.formatFieldName(field)} is required`
      });
      return errors; // Skip other validations if required field is empty
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Email validation
    if (rules.email && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push({
          field,
          message: 'Please enter a valid email address'
        });
      }
    }

    // Min length validation
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({
        field,
        message: `${this.formatFieldName(field)} must be at least ${rules.minLength} characters`
      });
    }

    // Max length validation
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({
        field,
        message: `${this.formatFieldName(field)} must not exceed ${rules.maxLength} characters`
      });
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      const message = rules.customMessage || `${this.formatFieldName(field)} format is invalid`;
      errors.push({
        field,
        message
      });
    }

    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      const message = rules.customMessage || `${this.formatFieldName(field)} is invalid`;
      errors.push({
        field,
        message
      });
    }

    return errors;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

// Common validation patterns
export const ValidationPatterns = {
  phone: /^(\+63|0)?[0-9]{10}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  plateNumber: /^[A-Z]{3}[0-9]{4}$|^[A-Z]{2}[0-9]{5}$/,
  licenseNumber: /^[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}$/
};

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  return ValidationPatterns.phone.test(phone);
};

export const validateRequired = (value: any): boolean => {
  return value !== undefined && value !== null && value !== '';
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

// Form validation for common forms
export const createLoginValidator = () => {
  return new FormValidator([
    {
      field: 'email',
      rules: {
        required: true,
        email: true
      }
    },
    {
      field: 'password',
      rules: {
        required: true,
        minLength: 6
      }
    }
  ]);
};

export const createDriverValidator = () => {
  return new FormValidator([
    {
      field: 'firstName',
      rules: {
        required: true,
        minLength: 2,
        maxLength: 50
      }
    },
    {
      field: 'lastName',
      rules: {
        required: true,
        minLength: 2,
        maxLength: 50
      }
    },
    {
      field: 'email',
      rules: {
        required: true,
        email: true
      }
    },
    {
      field: 'phone',
      rules: {
        required: true,
        pattern: ValidationPatterns.phone,
        customMessage: 'Please enter a valid Philippine phone number'
      }
    },
    {
      field: 'vehicleType',
      rules: {
        required: true,
        custom: (value) => ['motorcycle', 'car', 'suv', 'taxi'].includes(value),
        customMessage: 'Please select a valid vehicle type'
      }
    }
  ]);
};

export const createBookingValidator = () => {
  return new FormValidator([
    {
      field: 'serviceType',
      rules: {
        required: true,
        custom: (value) => ['ride_4w', 'ride_2w', 'send_delivery', 'eats_delivery', 'mart_delivery'].includes(value),
        customMessage: 'Please select a valid service type'
      }
    },
    {
      field: 'pickupLocation',
      rules: {
        required: true,
        custom: (value) => value && value.address && value.lat && value.lng,
        customMessage: 'Please provide a valid pickup location'
      }
    },
    {
      field: 'dropoffLocation',
      rules: {
        required: true,
        custom: (value) => value && value.address && value.lat && value.lng,
        customMessage: 'Please provide a valid dropoff location'
      }
    }
  ]);
};