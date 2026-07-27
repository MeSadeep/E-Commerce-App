// Role-Based Access Control (RBAC).
//
// Setup needed in Auth0 (one-time, dashboard only):
// 1. Auth0 Dashboard -> User Management -> Roles -> create "admin", "inventory_manager", "support"
// 2. Assign roles to specific users under Users -> (user) -> Roles
// 3. Auth0 Dashboard -> Actions -> Flows -> Login -> add an Action that copies
//    the user's roles into the token as a custom claim, e.g.:
//
//      exports.onExecutePostLogin = async (event, api) => {
//        const roles = event.authorization?.roles || [];
//        api.idToken.setCustomClaim('https://aperturegoods.com/roles', roles);
//        api.accessToken.setCustomClaim('https://aperturegoods.com/roles', roles);
//      };
//
// This middleware just reads that claim from the already-verified JWT
// (checkJwt must run before this) and checks it contains the required role.

const ROLE_CLAIM = 'https://aperturegoods.com/roles';

function requireRole(requiredRole) {
  return (req, res, next) => {
    const roles = req.auth?.payload?.[ROLE_CLAIM] || [];
    if (!roles.includes(requiredRole)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { requireRole, ROLE_CLAIM };
