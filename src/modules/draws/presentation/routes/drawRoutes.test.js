const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const { once } = require('node:events');
const createDrawRouter = require('./drawRoutes');
const schemas = require('../validators/drawSchemas');

async function createServer(t, controller, adminCalls) {
    const app = express();
    app.use(express.json());
    app.use('/api', createDrawRouter({
        controller,
        schemas,
        authenticate(req, res, next) {
            req.auth = { userId: 1 };
            next();
        },
        requireAdmin(req, res, next) {
            adminCalls.count += 1;
            next();
        },
    }));
    app.use((error, req, res, next) => {
        res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    });

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));
    return `http://127.0.0.1:${server.address().port}/api`;
}

function createController() {
    return {
        listConfigurationOptions: (_req, res) => res.json({
            success: true,
            data: {
                drawFormats: ['SINGLE_ELIMINATION'],
                seedingMethods: ['MANUAL'],
                defaults: {
                    drawFormat: 'SINGLE_ELIMINATION',
                    seedingMethod: 'MANUAL',
                    thirdPlaceMatch: false,
                },
            },
        }),
        listDrawConfigurations: (_req, res) => res.json({ success: true, data: [] }),
        getDrawConfiguration: (req, res) => res.json({
            success: true,
            data: {
                tournamentCategoryId: req.validatedParams.categoryId,
                drawFormat: 'SINGLE_ELIMINATION',
                seedingMethod: 'MANUAL',
            },
        }),
        listEligibleRegistrations: (_req, res) => res.json({ success: true, data: [] }),
        createDraft: (req, res) => res.status(201).json({
            success: true,
            data: { categoryId: req.validatedParams.categoryId, ...req.validatedBody },
        }),
        getLatestDraw: (_req, res) => res.json({ success: true }),
        getDraw: (_req, res) => res.json({ success: true }),
        getPublishedDraw: (_req, res) => res.json({ success: true, data: { status: 'PUBLISHED' } }),
        getCategoryLeaderboard: (_req, res) => res.json({
            success: true,
            data: { tournamentCategoryId: 4, entries: [] },
        }),
        assignPositions: (_req, res) => res.json({ success: true }),
        publish: (_req, res) => res.json({ success: true }),
        listRankingPointAwards: (_req, res) => res.json({ success: true, data: [] }),
        recordMatchResult: (req, res) => res.json({
            success: true,
            data: {
                drawId: req.validatedParams.drawId,
                matchId: req.validatedParams.matchId,
                games: req.validatedBody.games,
            },
        }),
        finalizeResults: (req, res) => res.json({
            success: true,
            data: { drawId: req.validatedParams.drawId },
        }),
    };
}

test('exposes draw configuration options and category configuration routes', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const options = await fetch(`${baseUrl}/draw-configurations/options`);
    assert.equal(options.status, 200);
    assert.deepEqual((await options.json()).data, {
        drawFormats: ['SINGLE_ELIMINATION'],
        seedingMethods: ['MANUAL'],
        defaults: {
            drawFormat: 'SINGLE_ELIMINATION',
            seedingMethod: 'MANUAL',
            thirdPlaceMatch: false,
        },
    });

    const category = await fetch(`${baseUrl}/admin/tournament-categories/4/draw-configuration`);
    assert.equal(category.status, 200);
    assert.equal((await category.json()).data.tournamentCategoryId, 4);
    assert.equal(adminCalls.count, 1);

    const allConfigurations = await fetch(`${baseUrl}/admin/draw-configurations`);
    assert.equal(allConfigurations.status, 200);
    assert.deepEqual((await allConfigurations.json()).data, []);
    assert.equal(adminCalls.count, 2);
});

test('admin draw creation validates input and reaches the guarded endpoint', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/admin/tournament-categories/4/draws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            drawFormat: 'SINGLE_ELIMINATION',
            seedingMethod: 'MANUAL',
        }),
    });

    assert.equal(response.status, 201);
    assert.equal(adminCalls.count, 1);
    assert.deepEqual((await response.json()).data, {
        categoryId: 4,
        drawFormat: 'SINGLE_ELIMINATION',
        seedingMethod: 'MANUAL',
    });
});

test('public draw reads do not pass through admin authentication', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/tournament-categories/4/draw`);

    assert.equal(response.status, 200);
    assert.equal(adminCalls.count, 0);
    assert.deepEqual(await response.json(), {
        success: true,
        data: { status: 'PUBLISHED' },
    });
});

test('public tournament-category leaderboard does not require admin authentication', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/tournament-categories/4/leaderboard`);

    assert.equal(response.status, 200);
    assert.equal(adminCalls.count, 0);
    assert.deepEqual(await response.json(), {
        success: true,
        data: { tournamentCategoryId: 4, entries: [] },
    });
});

test('admin match results validate score input and require the guarded route', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/admin/draws/7/matches/22/result`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            games: [
                { gameNumber: 1, participant1Score: 21, participant2Score: 17 },
                { gameNumber: 2, participant1Score: 19, participant2Score: 21 },
                { gameNumber: 3, participant1Score: 21, participant2Score: 18 },
            ],
        }),
    });

    assert.equal(response.status, 200);
    assert.equal(adminCalls.count, 1);
    assert.deepEqual((await response.json()).data, {
        drawId: 7,
        matchId: 22,
        games: [
            { gameNumber: 1, participant1Score: 21, participant2Score: 17 },
            { gameNumber: 2, participant1Score: 19, participant2Score: 21 },
            { gameNumber: 3, participant1Score: 21, participant2Score: 18 },
        ],
    });
});

test('ranking point history is available only through the guarded admin route', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/admin/tournament-categories/4/ranking-point-awards`);

    assert.equal(response.status, 200);
    assert.equal(adminCalls.count, 1);
    assert.deepEqual((await response.json()).data, []);
});
