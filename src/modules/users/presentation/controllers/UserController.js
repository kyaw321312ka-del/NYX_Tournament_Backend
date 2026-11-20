const users = [
    { id: 1, name: 'Aung Aung' },
    { id: 2, name: 'Mg Mg' },
];

function listUsers(req, res) {
    return res.status(200).json({
        success: true,
        data: users,
    });
}

function getUser(req, res) {
    const id = Number(req.params.id);
    const user = users.find((item) => item.id === id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    return res.status(200).json({
        success: true,
        data: user,
    });
}

function createUpdateProfileImageController(updatePlayerProfileImage) {
    return async function updateProfileImage(req, res, next) {
        try {
            const user = await updatePlayerProfileImage.execute(req.auth.userId, req.file);
            return res.status(200).json({
                success: true,
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    profileImageUrl: user.profileImageUrl,
                },
            });
        } catch (error) {
            return next(error);
        }
    };
}

function createUpdateIdentityDocumentsController(updateIdentityDocuments) {
    return async function updateIdentityDocumentsRequest(req, res, next) {
        try {
            const user = await updateIdentityDocuments.execute(req.auth.userId, req.files);
            return res.status(200).json({
                success: true,
                data: {
                    id: user.id,
                    name: user.name,
                    frontIdImgUploaded: Boolean(user.frontIdImg),
                    backIdImgUploaded: Boolean(user.backIdImg),
                },
            });
        } catch (error) {
            return next(error);
        }
    };
}

function createUpdateProfileController(updateUserProfile) {
    return async function updateProfile(req, res, next) {
        try {
            const result = await updateUserProfile.execute(req.auth.userId, req.validatedBody, req.files);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return next(error);
        }
    };
}

function createVerifyEmailChangeController(verifyEmailChange) {
    return async function verifyEmailChangeRequest(req, res, next) {
        try {
            const user = await verifyEmailChange.execute(req.auth.userId, req.validatedBody);
            return res.status(200).json({ success: true, data: { user } });
        } catch (error) {
            return next(error);
        }
    };
}

function createReviewIdentityDocumentsController(reviewIdentityDocuments) {
    return async function reviewIdentityDocumentsRequest(req, res, next) {
        try {
            const result = await reviewIdentityDocuments.execute(
                req.validatedParams.userId,
                req.validatedBody.verificationStatus,
            );
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return next(error);
        }
    };
}

function createListAdminPlayersController(listAdminPlayers) {
    return async function listAdminPlayersRequest(req, res, next) {
        try {
            const result = await listAdminPlayers.execute(req.validatedQuery);
            return res.status(200).json({
                success: true,
                data: result.items,
                pagination: result.pagination,
            });
        } catch (error) {
            return next(error);
        }
    };
}

function createGetAdminPlayerDetailsController(getAdminPlayerDetails) {
    return async function getAdminPlayerDetailsRequest(req, res, next) {
        try {
            const result = await getAdminPlayerDetails.execute(req.validatedParams.userId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return next(error);
        }
    };
}

function createGetAdminIdentityDocumentController(getAdminIdentityDocument) {
    return async function getAdminIdentityDocumentRequest(req, res, next) {
        try {
            const document = await getAdminIdentityDocument.execute(
                req.validatedParams.userId,
                req.validatedParams.side,
            );
            res.set({
                'Content-Type': document.contentType,
                'Cache-Control': 'private, no-store',
                'Content-Disposition': 'inline',
                'X-Content-Type-Options': 'nosniff',
            });
            return res.status(200).send(document.buffer);
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = {
    listUsers,
    getUser,
    createUpdateProfileImageController,
    createUpdateIdentityDocumentsController,
    createUpdateProfileController,
    createVerifyEmailChangeController,
    createReviewIdentityDocumentsController,
    createListAdminPlayersController,
    createGetAdminPlayerDetailsController,
    createGetAdminIdentityDocumentController,
};
