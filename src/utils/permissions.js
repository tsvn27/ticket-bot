const db = require('../database');

function isAdmin(member) {
    if (!member) return false;
    if (member.permissions.has('Administrator')) return true;
    return false;
}

function isStaff(member) {
    if (!member) return false;
    if (isAdmin(member)) return true;
    if (member.permissions.has('ManageChannels')) return true;
    if (member.permissions.has('ManageMessages')) return true;
    
    const guildId = member.guild?.id;
    if (guildId) {
        const staffRole = db.settings.get('roles.staff');
        if (staffRole && member.roles.cache.has(staffRole)) return true;
    }
    
    return false;
}

function hasPermission(userId) {
    return false;
}

async function isAdminAsync(member, guildId) {
    if (!member) return false;
    const gid = guildId || member.guild?.id;
    if (!gid) return member.permissions.has('Administrator');
    
    const settings = await db.settings.get(gid);
    const adminRole = settings?.roles?.admin;
    const owner = settings?.owner;
    
    if (member.id === owner) return true;
    if (adminRole && member.roles.cache.has(adminRole)) return true;
    if (member.permissions.has('Administrator')) return true;
    
    return false;
}

async function isStaffAsync(member, guildId) {
    if (!member) return false;
    if (await isAdminAsync(member, guildId)) return true;
    
    const gid = guildId || member.guild?.id;
    if (!gid) return false;
    
    const settings = await db.settings.get(gid);
    const staffRole = settings?.roles?.staff;
    if (staffRole && member.roles.cache.has(staffRole)) return true;
    
    return false;
}

module.exports = { isAdmin, isStaff, hasPermission, isAdminAsync, isStaffAsync };
