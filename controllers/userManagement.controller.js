import { blockUserService, getUsersService } from '../services/userManagement.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const getUsers = async (req, res) => {
  const query = req.query;
  const { allUsers, totalPosts } = await getUsersService(query);
  res
    .status(STATUS_CODES.OK)
    .json({ users: allUsers, totalPosts, page: query.page, perPage: query.perPage });
};

const blockUserController = async (req, res) => {
  const id = req.params.id;
  const user = await blockUserService(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: user.isBlocked ? 'User Blocked' : 'User Unblocked',
    user,
  });
};

export { getUsers, blockUserController };
