const { z } = require('zod');
const PairingType = require('../../domain/enums/PairingType');
const RegistrationStatus = require('../../domain/enums/RegistrationStatus');

const pairingTypes = Object.values(PairingType);
const registrationStatuses = Object.values(RegistrationStatus);
const date = z.iso.date();

const pointTier = z.object({
    position: z.number().int().positive(),
    label: z.string().trim().min(1).max(100),
    points: z.number().int().min(0),
});

const venue = z.object({
    venueName: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(500),
});

const rule = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1),
    sortOrder: z.number().int().min(0).default(0),
});

const category = z.object({
    categoryCode: z.string().trim().min(1).max(30),
    categoryName: z.string().trim().min(1).max(150),
    entryFee: z.number().finite().min(0).max(9999999999.99)
        .refine(
            (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
            'Entry fee supports at most two decimal places.',
        )
        .default(0),
    pairingType: z.enum(pairingTypes),
    seedCount: z.number().int().min(0).default(0),
    matchFormat: z.string().trim().min(1).max(100),
    entryStatus: z.enum(registrationStatuses).default(RegistrationStatus.OPEN),
    eligibilityCriteria: z.string().trim().optional().nullable(),
    pointsPool: z.number().int().min(0).default(0),
    shuttleName: z.string().trim().max(150).optional().nullable(),
    shuttleSpeed: z.string().trim().max(30).optional().nullable(),
    pointTiers: z.array(pointTier).default([]),
});

const fields = {
    title: z.string().trim().min(1).max(200),
    bannerUrl: z.url().max(2048).nullable(),
    description: z.string().trim().max(500).nullable(),
    startDate: date,
    endDate: date,
    rankingPointsPool: z.number().int().min(0),
    venues: z.array(venue).max(50),
    rules: z.array(rule).max(100),
    categories: z.array(category).max(100),
};

const createTournamentSchema = z.object({
    title: fields.title,
    bannerUrl: fields.bannerUrl.optional().default(null),
    description: fields.description.optional().default(null),
    startDate: fields.startDate,
    endDate: fields.endDate,
    rankingPointsPool: fields.rankingPointsPool.default(0),
    venues: fields.venues.default([]),
    rules: fields.rules.default([]),
    categories: fields.categories.default([]),
}).strict()
    .refine((value) => value.endDate >= value.startDate, {
        path: ['endDate'],
        message: 'End date must be on or after start date.',
    });

const updateTournamentSchema = z.object({
    title: fields.title.optional(),
    bannerUrl: fields.bannerUrl.optional(),
    description: fields.description.optional(),
    startDate: fields.startDate.optional(),
    endDate: fields.endDate.optional(),
    rankingPointsPool: fields.rankingPointsPool.optional(),
    venues: fields.venues.optional(),
    rules: fields.rules.optional(),
    categories: fields.categories.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

const listTournamentsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const tournamentIdSchema = z.object({
    id: z.coerce.number().int().positive(),
});

module.exports = {
    createTournamentSchema,
    updateTournamentSchema,
    listTournamentsSchema,
    tournamentIdSchema,
};
