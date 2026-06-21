ALTER TABLE `shop-order`.t_order ADD COLUMN status VARCHAR(20) DEFAULT 'CREATED' AFTER number;
SELECT id, status FROM `shop-order`.t_order;
