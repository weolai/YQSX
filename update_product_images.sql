-- ============================================================
-- 商品图片更新脚本
-- 使用 Unsplash 真实零食图片作为占位图
-- 执行后商品列表将显示真实的零食图片
-- ============================================================

USE `shop-product`;

-- 方案 1: 使用 Unsplash 随机零食图片（推荐）
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,chips,1' WHERE `id` = 1;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,ketchup' WHERE `id` = 2;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,vinegar' WHERE `id` = 3;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,spicy,red' WHERE `id` = 4;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,tomato' WHERE `id` = 5;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,onion' WHERE `id` = 6;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?potato,chips,salty' WHERE `id` = 7;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,small,pack' WHERE `id` = 8;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,large,pack' WHERE `id` = 9;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,vinegar,2' WHERE `id` = 10;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?snack,ring,wheel' WHERE `id` = 11;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,ketchup,2' WHERE `id` = 12;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?potato,sticks,fries' WHERE `id` = 13;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,salt,yellow' WHERE `id` = 14;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?chips,sour,green' WHERE `id` = 15;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?biscuit,mini,cookie' WHERE `id` = 16;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?biscuit,cream,sandwich' WHERE `id` = 17;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?cookie,mini,round' WHERE `id` = 18;
UPDATE `t_product` SET `image_url` = 'https://source.unsplash.com/400x400/?wafer,chocolate,layered' WHERE `id` = 19;

-- 验证更新
SELECT id, name, image_url FROM `t_product` ORDER BY id;

-- ============================================================
-- 方案 2: 使用彩色占位图（备选方案）
-- ============================================================

/*
-- 如果 Unsplash 访问较慢，可以使用以下彩色占位图

UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=Ashi+Mashi' WHERE `id` = 1;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/4ECDC4/FFFFFF?text=Chee+Ketchup' WHERE `id` = 2;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/45B7D1/FFFFFF?text=Chee+Vinegar' WHERE `id` = 3;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/F38181/FFFFFF?text=Cheetoz+Chili' WHERE `id` = 4;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FDCB9E/000000?text=Cheetoz+Ketchup' WHERE `id` = 5;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/A8E6CF/000000?text=Cheetoz+Onion' WHERE `id` = 6;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FFD3B6/000000?text=Cheetoz+Salty' WHERE `id` = 7;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FFAAA5/FFFFFF?text=Cheetoz+30g' WHERE `id` = 8;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FF8B94/FFFFFF?text=Cheetoz+90g' WHERE `id` = 9;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/A8D8EA/000000?text=Cheetoz+Vinegar' WHERE `id` = 10;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/AA96DA/FFFFFF?text=Cheetoz+Wheel' WHERE `id` = 11;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FCBAD3/000000?text=Maz+Ketchup' WHERE `id` = 12;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/FFFFD2/000000?text=Maz+Sticks' WHERE `id` = 13;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/A8DADC/000000?text=Maz+Salty' WHERE `id` = 14;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/457B9D/FFFFFF?text=Maz+Vinegar' WHERE `id` = 15;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/F1FAEE/000000?text=Mini+Lina' WHERE `id` = 16;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/E63946/FFFFFF?text=Minoo+Biscuit' WHERE `id` = 17;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/F4A261/000000?text=Naderi+Cookie' WHERE `id` = 18;
UPDATE `t_product` SET `image_url` = 'https://via.placeholder.com/400x400/2A9D8F/FFFFFF?text=Naderi+Wafer' WHERE `id` = 19;
*/

-- ============================================================
-- 方案 3: 使用固定的高质量零食图片 URL
-- ============================================================

/*
-- 如果有具体的图片 URL，可以替换为以下格式

UPDATE `t_product` SET `image_url` = 'https://your-cdn.com/products/ashi_mashi.jpg' WHERE `id` = 1;
UPDATE `t_product` SET `image_url` = 'https://your-cdn.com/products/chee_ketchup.jpg' WHERE `id` = 2;
-- ... 其他商品
*/
