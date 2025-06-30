exports.allUserGet = async (req, res, next) => {
    try {
        const result = await usersCollection.find().toArray();
        res.status(200).json({
            message: 'user retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

