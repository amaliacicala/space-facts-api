import express, { Router } from "express";

import prisma from "../lib/prisma/client";

import {
    validate,
    planetSchema,
    PlanetData,
} from "../lib/middleware/validation";

import { checkAuthorization } from "../lib/middleware/passport";

import { initMulterMiddleware } from "../lib/middleware/multer";

const upload = initMulterMiddleware();

const router = Router();

// GET /planets - Retrieve all planets
router.get("/", async (request, response) => {
    const planets = await prisma.planet.findMany();

    response.json(planets);
});

// GET /planets/:id - Retrieve a specific planet
router.get("/:id(\\d+)", async (request, response, next) => {
    const planetId = Number(request.params.id);

    const planet = await prisma.planet.findUnique({
        where: { id: planetId },
    });

    if (!planet) {
        response.status(404);
        return next(`Cannot GET /planets/${planetId}`);
    }

    response.json(planet);
});

// POST /planets - Create a new planet
router.post(
    "/",
    checkAuthorization,
    validate({ body: planetSchema }),
    async (request, response) => {
        const planetData: PlanetData = request.body;
        const username = request.user?.username as string;

        const planet = await prisma.planet.create({
            data: {
                ...planetData,
                updatedBy: username,
                createBy: username,
            },
        });

        response.status(201).json(planet);
    }
);

// PUT /planets/:id - Replace an existing planet
router.put(
    "/:id(\\d+)",
    checkAuthorization,
    validate({ body: planetSchema }),
    async (request, response, next) => {
        const planetId = Number(request.params.id);
        const planetData: PlanetData = request.body;
        const username = request.user?.username as string;

        try {
            const planet = await prisma.planet.update({
                where: { id: planetId },
                data: {
                    ...planetData,
                    updatedBy: username,
                    createBy: username,
                },
            });

            response.status(200).json(planet);
        } catch (error) {
            response.status(404);
            next(`Cannot PUT /planets/${planetId}`);
        }
    }
);

// DELETE /planets/:id - Delete a planet
router.delete(
    "/:id(\\d+)",
    checkAuthorization,
    async (request, response, next) => {
        const planetId = Number(request.params.id);

        try {
            await prisma.planet.delete({
                where: { id: planetId },
            });

            response.status(204).end();
        } catch (error) {
            response.status(404);
            next(`Cannot DELETE /planets/${planetId}`);
        }
    }
);

// POST /planets/:id/photo - Upload a photo to a planet
router.post(
    "/:id(\\d+)/photo",
    checkAuthorization,
    upload.single("photo"),
    async (request, response, next) => {
        // if there's no file
        if (!request.file) {
            response.status(400);
            return next("No photo file uploaded.");
        }

        const planetId = Number(request.params.id);
        const photoFilename = request.file.filename;

        try {
            await prisma.planet.update({
                where: { id: planetId },
                data: { photoFilename },
            });

            response.status(201).json({ photoFilename });
        } catch (error) {
            response.status(404);
            next(`Cannot POST /planets/${planetId}/photo`);
        }
    }
);

// view uploaded photos in the browser - http://localhost:3000/planets/photos/{filename.extension}
router.use("/photos", express.static("uploads"));

export default router;
