import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { ENV } from '../config/env.js';
import { Role } from '../types/enums.js';

export class AuthService {
  static async registerPatient(data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    gender?: string;
    city?: string;
    district?: string;
    cnamgsNumber?: string;
  }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existing) {
      throw new Error('Un compte existe déjà avec cette adresse email ou ce numéro de téléphone');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: Role.PATIENT,
        firstName: data.firstName,
        lastName: data.lastName,
        patientProfile: {
          create: {
            gender: data.gender,
            city: data.city || 'Libreville',
            district: data.district,
            cnamgsNumber: data.cnamgsNumber,
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    const token = this.generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async registerDoctor(data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    cnomNumber: string;
    specialty: string;
    subSpecialties?: string;
    bio?: string;
    consultationFee?: number;
    acceptsCnamgs?: boolean;
    acceptsTeleconsult?: boolean;
    acceptsHomeVisit?: boolean;
    address: string;
    city?: string;
    district?: string;
    latitude: number;
    longitude: number;
  }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existing) {
      throw new Error('Un compte existe déjà avec cet email ou ce numéro de téléphone');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: Role.DOCTOR,
        firstName: data.firstName,
        lastName: data.lastName,
        doctorProfile: {
          create: {
            cnomNumber: data.cnomNumber,
            specialty: data.specialty,
            subSpecialties: data.subSpecialties,
            bio: data.bio,
            consultationFee: data.consultationFee ?? 15000,
            acceptsCnamgs: data.acceptsCnamgs ?? true,
            acceptsTeleconsult: data.acceptsTeleconsult ?? false,
            acceptsHomeVisit: data.acceptsHomeVisit ?? false,
            address: data.address,
            city: data.city || 'Libreville',
            district: data.district,
            latitude: data.latitude,
            longitude: data.longitude,
            verificationStatus: 'PENDING',
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    const token = this.generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async registerPharmacy(data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    name: string;
    licenseNumber?: string;
    address: string;
    city?: string;
    district?: string;
    latitude: number;
    longitude: number;
    pharmacyPhone: string;
    emergencyPhone?: string;
    openingHours?: string;
    isOnDuty?: boolean;
    acceptsCnamgs?: boolean;
  }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existing) {
      throw new Error('Un compte existe déjà avec cet email ou ce numéro de téléphone');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: Role.PHARMACY,
        firstName: data.firstName,
        lastName: data.lastName,
        pharmacyProfile: {
          create: {
            name: data.name,
            licenseNumber: data.licenseNumber,
            address: data.address,
            city: data.city || 'Libreville',
            district: data.district,
            latitude: data.latitude,
            longitude: data.longitude,
            phone: data.pharmacyPhone,
            emergencyPhone: data.emergencyPhone,
            openingHours: data.openingHours || '08h00 - 20h00',
            isOnDuty: data.isOnDuty ?? false,
            acceptsCnamgs: data.acceptsCnamgs ?? true,
            verificationStatus: 'PENDING',
          },
        },
      },
      include: {
        pharmacyProfile: true,
      },
    });

    const token = this.generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async login(emailOrPhone: string, pass: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
      include: {
        patientProfile: true,
        doctorProfile: true,
        pharmacyProfile: true,
        clinicProfile: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      throw new Error('Identifiants incorrects (Email/Téléphone ou Mot de passe)');
    }

    const isValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isValid) {
      throw new Error('Identifiants incorrects (Email/Téléphone ou Mot de passe)');
    }

    const token = this.generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        doctorProfile: {
          include: { availabilities: true },
        },
        pharmacyProfile: true,
        clinicProfile: true,
        subscriptions: true,
      },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private static generateToken(user: { id: string; email: string; role: string; firstName: string; lastName: string }) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );
  }
}
