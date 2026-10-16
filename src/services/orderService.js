const crypto = require('crypto');
const db = require('../utils/database');
const config = require('../../config');
const { sendLog } = require('./logService');

/**
 * Generate a unique Order ID: ORD-XXXXXX
 */
function generateOrderId() {
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${code}`;
}

/**
 * Create a new order
 */
async function createOrder(guild, user, product) {
  const orderId = generateOrderId();
  const order = {
    orderId,
    guildId: guild.id,
    userId: user.id,
    userTag: user.tag || user.username,
    productId: product.id,
    productName: product.name,
    price: product.price,
    warranty: product.warranty || 'No Warranty',
    date: new Date().toISOString(),
    status: 'Waiting for Payment', // Pending, Waiting for Payment, Paid, Delivered, Cancelled, Refunded
    receiptAttachmentUrl: null,
    ticketChannelId: null,
    paidAt: null,
    deliveredAt: null,
    approvedBy: null
  };

  const allOrders = db.orders.all();
  allOrders[orderId] = order;
  db.orders.set(orderId, order);

  await sendLog(guild, {
    title: 'Order Created',
    description: `A new purchase has been initiated by <@${user.id}>.`,
    color: config.colors.primary,
    fields: [
      { name: 'Order ID', value: `\`${orderId}\``, inline: true },
      { name: 'Product', value: `${product.name} (\`${product.id}\`)`, inline: true },
      { name: 'Price', value: `${product.price}`, inline: true },
      { name: 'Status', value: `⏳ ${order.status}`, inline: true }
    ],
    user,
    action: 'ORDER_CREATED'
  });

  return order;
}

/**
 * Update order status
 */
async function updateOrderStatus(guild, orderId, newStatus, staffUser = null, reason = null) {
  const order = db.orders.get(orderId);
  if (!order) return null;

  const oldStatus = order.status;
  order.status = newStatus;

  if (newStatus === 'Paid') {
    order.paidAt = new Date().toISOString();
    if (staffUser) order.approvedBy = staffUser.id;
  } else if (newStatus === 'Delivered') {
    order.deliveredAt = new Date().toISOString();
  }

  db.orders.set(orderId, order);

  await sendLog(guild, {
    title: `Order Status Updated: ${newStatus}`,
    description: `Order \`${orderId}\` status changed from **${oldStatus}** to **${newStatus}**.`,
    color: newStatus === 'Paid' || newStatus === 'Delivered' ? config.colors.success : config.colors.warning,
    fields: [
      { name: 'Order ID', value: `\`${orderId}\``, inline: true },
      { name: 'Customer', value: `<@${order.userId}>`, inline: true },
      { name: 'Product', value: `${order.productName}`, inline: true },
      { name: 'Updated By', value: staffUser ? `<@${staffUser.id}>` : 'System', inline: true },
      ...(reason ? [{ name: 'Reason', value: reason }] : [])
    ],
    user: staffUser,
    action: `ORDER_${newStatus.toUpperCase()}`
  });

  return order;
}

function getOrder(orderId) {
  return db.orders.get(orderId);
}

function getUserOrders(userId) {
  const allOrders = db.orders.all();
  return Object.values(allOrders).filter(o => o.userId === userId);
}

module.exports = {
  generateOrderId,
  createOrder,
  updateOrderStatus,
  getOrder,
  getUserOrders
};
