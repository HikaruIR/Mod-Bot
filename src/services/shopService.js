const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');
const { sendLog } = require('./logService');

/**
 * Builds the professional Ocean Shop product embed
 */
function buildProductEmbed(product) {
  const isAvailable = product.stockStatus?.toLowerCase() !== 'out of stock' && product.status !== 'disabled';

  const embed = new EmbedBuilder()
    .setTitle(`${config.emojis.shop} ${product.name}`)
    .setDescription(product.description || 'No description provided.')
    .setColor(product.status === 'disabled' ? config.colors.neutral : config.colors.shop)
    .addFields(
      {
        name: `${config.emojis.price} Price`,
        value: `**${product.price}**`,
        inline: true
      },
      {
        name: `${config.emojis.warranty} Warranty`,
        value: `${product.warranty || 'No Warranty'}`,
        inline: true
      },
      {
        name: `${config.emojis.stock} Stock`,
        value: isAvailable ? `🟢 **${product.stockStatus || 'Available'}**` : `🔴 **Out of Stock**`,
        inline: true
      }
    )
    .setFooter({
      text: `${config.brand.footer} • ID: ${product.id}`,
      iconURL: config.brand.avatar
    })
    .setTimestamp();

  if (product.category) {
    embed.addFields({
      name: `📁 Category`,
      value: `\`${product.category}\``,
      inline: true
    });
  }

  if (product.image) {
    embed.setImage(product.image);
  }

  if (product.thumbnail) {
    embed.setThumbnail(product.thumbnail);
  }

  return embed;
}

/**
 * Builds the action buttons for a product (Buy & Support)
 */
function buildProductButtons(product) {
  const isAvailable = product.stockStatus?.toLowerCase() !== 'out of stock' && product.status !== 'disabled';

  const buyButton = new ButtonBuilder()
    .setCustomId(`shop_buy_${product.id}`)
    .setLabel('Buy Now')
    .setEmoji(config.emojis.shop)
    .setStyle(ButtonStyle.Success)
    .setDisabled(!isAvailable);

  const supportButton = new ButtonBuilder()
    .setCustomId(`shop_support_${product.id}`)
    .setLabel('Support')
    .setEmoji(config.emojis.support)
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(buyButton, supportButton);
}

/**
 * Create a new product and optionally create its dedicated channel
 */
async function createProduct(guild, productData, author = null) {
  const allProducts = db.products.all();
  const productId = productData.id.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (allProducts[productId]) {
    throw new Error(`Product with ID "${productId}" already exists!`);
  }

  // Get configured product category if any
  const guildConfig = db.config.get(guild.id) || {};
  let targetCategory = null;
  if (guildConfig.productCategoryId) {
    targetCategory = guild.channels.cache.get(guildConfig.productCategoryId);
  }

  let channel = null;
  // If specific channel provided or create dedicated channel
  if (productData.channelId) {
    channel = guild.channels.cache.get(productData.channelId);
  }

  if (!channel) {
    const channelName = `${productData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-product`.slice(0, 95);
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: targetCategory ? targetCategory.id : undefined,
      topic: `Ocean Shop Product Channel | ID: ${productId} | Price: ${productData.price}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions]
        }
      ]
    });
  }

  const product = {
    id: productId,
    guildId: guild.id,
    name: productData.name,
    price: productData.price,
    description: productData.description || 'Full description of the product.',
    image: productData.image || null,
    thumbnail: productData.thumbnail || null,
    warranty: productData.warranty || 'No Warranty',
    stockStatus: productData.stockStatus || 'Available',
    category: productData.category || 'General',
    channelId: channel.id,
    messageId: null,
    status: productData.status || 'active',
    createdAt: new Date().toISOString()
  };

  // Publish embed to channel
  const embed = buildProductEmbed(product);
  const row = buildProductButtons(product);
  const sentMessage = await channel.send({ embeds: [embed], components: [row] });
  product.messageId = sentMessage.id;

  db.products.set(productId, product);

  await sendLog(guild, {
    title: 'Product Created',
    description: `Product **${product.name}** (\`${product.id}\`) created and published to <#${channel.id}>.`,
    color: config.colors.success,
    fields: [
      { name: 'Price', value: product.price, inline: true },
      { name: 'Warranty', value: product.warranty, inline: true },
      { name: 'Stock', value: product.stockStatus, inline: true }
    ],
    user: author,
    action: 'PRODUCT_CREATE'
  });

  return product;
}

/**
 * Edit an existing product and update its message embed in Discord
 */
async function editProduct(guild, productId, updates, author = null) {
  const product = db.products.get(productId);
  if (!product) {
    throw new Error(`Product with ID "${productId}" not found.`);
  }

  Object.assign(product, updates);
  product.updatedAt = new Date().toISOString();

  // Update existing Discord embed in dedicated channel
  if (product.channelId && product.messageId) {
    try {
      const channel = guild.channels.cache.get(product.channelId);
      if (channel) {
        const msg = await channel.messages.fetch(product.messageId).catch(() => null);
        if (msg) {
          const embed = buildProductEmbed(product);
          const row = buildProductButtons(product);
          await msg.edit({ embeds: [embed], components: [row] });
        }
      }
    } catch (err) {
      console.warn(`Could not edit message for product ${productId}:`, err.message);
    }
  }

  db.products.set(productId, product);

  await sendLog(guild, {
    title: 'Product Edited',
    description: `Product **${product.name}** (\`${productId}\`) has been updated.`,
    color: config.colors.warning,
    fields: [
      { name: 'Updated Fields', value: Object.keys(updates).join(', ') }
    ],
    user: author,
    action: 'PRODUCT_EDIT'
  });

  return product;
}

/**
 * Publish / Republish product embed in its channel
 */
async function publishProduct(guild, productId, author = null) {
  const product = db.products.get(productId);
  if (!product) {
    throw new Error(`Product with ID "${productId}" not found.`);
  }

  const channel = guild.channels.cache.get(product.channelId);
  if (!channel) {
    throw new Error(`Product channel not found or deleted.`);
  }

  const embed = buildProductEmbed(product);
  const row = buildProductButtons(product);
  const sentMessage = await channel.send({ embeds: [embed], components: [row] });
  product.messageId = sentMessage.id;
  db.products.set(productId, product);

  await sendLog(guild, {
    title: 'Product Published',
    description: `Product **${product.name}** published in <#${channel.id}>.`,
    color: config.colors.shop,
    user: author,
    action: 'PRODUCT_PUBLISH'
  });

  return product;
}

/**
 * Disable or Enable a product
 */
async function toggleProductStatus(guild, productId, disable = true, author = null) {
  const product = db.products.get(productId);
  if (!product) {
    throw new Error(`Product with ID "${productId}" not found.`);
  }

  product.status = disable ? 'disabled' : 'active';
  return await editProduct(guild, productId, { status: product.status }, author);
}

/**
 * Delete a product and optionally remove its channel
 */
async function deleteProduct(guild, productId, deleteChannel = false, author = null) {
  const product = db.products.get(productId);
  if (!product) {
    throw new Error(`Product with ID "${productId}" not found.`);
  }

  if (deleteChannel && product.channelId) {
    const ch = guild.channels.cache.get(product.channelId);
    if (ch) {
      await ch.delete('Product deleted').catch(() => {});
    }
  }

  db.products.delete(productId);

  await sendLog(guild, {
    title: 'Product Deleted',
    description: `Product **${product.name}** (\`${productId}\`) was permanently deleted.`,
    color: config.colors.danger,
    user: author,
    action: 'PRODUCT_DELETE'
  });

  return product;
}

module.exports = {
  buildProductEmbed,
  buildProductButtons,
  createProduct,
  editProduct,
  publishProduct,
  toggleProductStatus,
  deleteProduct
};
