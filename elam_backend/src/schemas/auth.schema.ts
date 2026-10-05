import { z } from 'zod';
import { Role } from '../types/enums.js';

export const registerPatientSchema = z.object({
  email: z.string().email('Format email invalide'),
  phone: z.string().min(8, 'Numéro de téléphone requis (+241...)'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  gender: z.string().optional(),
  city: z.string().default('Libreville'),
  district: z.string().optional(),
  cnamgsNumber: z.string().optional(),
});

export const registerDoctorSchema = z.object({
  email: z.string().email('Format email invalide'),
  phone: z.string().min(8, 'Numéro de téléphone requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  cnomNumber: z.string().min(3, 'Numéro d\'inscription à l\'Ordre des Médecins requis'),
  title: z.string().optional(),
  specialty: z.string().min(2, 'Spécialité médicale requise'),
  subSpecialties: z.string().optional(),
  bio: z.string().optional(),
  consultationFee: z.number().nonnegative().default(15000),
  acceptsCnamgs: z.boolean().default(true),
  acceptsTeleconsult: z.boolean().default(false),
  acceptsHomeVisit: z.boolean().default(false),
  address: z.string().min(3, 'Adresse du cabinet requise'),
  city: z.string().default('Libreville'),
  district: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  positionConfirmed: z.boolean().default(false),
});

export const registerPharmacySchema = z.object({
  email: z.string().email('Format email invalide'),
  phone: z.string().min(8, 'Numéro de téléphone requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(2, 'Prénom du responsable'),
  lastName: z.string().min(2, 'Nom du responsable'),
  name: z.string().min(2, 'Nom de l\'officine de pharmacie requis'),
  licenseNumber: z.string().optional(),
  address: z.string().min(3, 'Adresse requise'),
  city: z.string().default('Libreville'),
  district: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  positionConfirmed: z.boolean().default(false),
  pharmacyPhone: z.string().min(8, 'Numéro direct de la pharmacie'),
  emergencyPhone: z.string().optional(),
  openingHours: z.string().default('08h00 - 20h00'),
  isOnDuty: z.boolean().default(false),
  acceptsCnamgs: z.boolean().default(true),
});

export const registerClinicSchema = z.object({
  email: z.string().email('Format email invalide'),
  phone: z.string().min(8, 'Numéro du responsable requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(2, 'Prénom du responsable requis'),
  lastName: z.string().min(2, 'Nom du responsable requis'),
  name: z.string().min(2, 'Nom de l\'établissement requis'),
  type: z.enum(['CLINIC', 'HOSPITAL']).default('CLINIC'),
  address: z.string().min(3, 'Adresse requise'),
  city: z.string().default('Libreville'),
  district: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  positionConfirmed: z.boolean().default(false),
  clinicPhone: z.string().min(8, 'Numéro direct de l\'établissement requis'),
  emergencyPhone247: z.string().optional(),
  hasEmergency247: z.boolean().default(false),
  acceptsCnamgs: z.boolean().default(true),
  services: z.array(z.string().min(2)).default([]),
});

export const loginSchema = z.object({
  emailOrPhone: z.string().min(3, 'Email ou numéro de téléphone requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});
