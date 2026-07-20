import express from 'express';
import { createRide, joinRide, getMyRides } from '../controllers/ride.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = express.Router();

// Note: We will add auth middleware to these shortly!
// For now, we'll pass userId in the body to test, then secure it.
router.use(protect);

router.post('/', createRide);
router.post('/join', joinRide);
router.get('/', getMyRides);

export default router;