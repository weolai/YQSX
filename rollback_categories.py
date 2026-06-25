import subprocess

mysql_exe = r'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'

def run(sql, desc=""):
    r = subprocess.run([mysql_exe, '-uroot', '-p1234', '-e', sql], capture_output=True, text=True)
    if r.stderr and 'Warning' not in r.stderr:
        print(f"[{desc}] ERROR: {r.stderr}")
    else:
        print(f"[{desc}] OK")
    return r

# Clear
run("USE shop-product; SET FOREIGN_KEY_CHECKS=0; DELETE FROM t_product; DELETE FROM t_product_category; SET FOREIGN_KEY_CHECKS=1;", "CLEAR")

# Categories (original 19)
cat_sql = """INSERT INTO t_product_category (id, name, display_name, yolo_class_id, description, sort_order, status) VALUES
(1,'Ashi Mashi snacks','Ashi Mashi 零食',0,'Ashi Mashi 零食',1,1),
(2,'Chee pellet ketchup','Chee pellet 番茄酱味',1,'Chee pellet 番茄酱味',2,1),
(3,'Chee pellet vinegar','Chee pellet 醋味',2,'Chee pellet 醋味',3,1),
(4,'Cheetoz chili chips','Cheetoz 辣椒味薯片',3,'Cheetoz 辣椒味薯片',4,1),
(5,'Cheetoz ketchup chips','Cheetoz 番茄酱味薯片',4,'Cheetoz 番茄酱味薯片',5,1),
(6,'Cheetoz onion and parsley chips','Cheetoz 洋葱香菜味薯片',5,'Cheetoz 洋葱香菜味薯片',6,1),
(7,'Cheetoz salty chips','Cheetoz 咸味薯片',6,'Cheetoz 咸味薯片',7,1),
(8,'Cheetoz snack 30g','Cheetoz 零食 30g',7,'Cheetoz 零食 30g',8,1),
(9,'Cheetoz snack 90g','Cheetoz 零食 90g',8,'Cheetoz 零食 90g',9,1),
(10,'Cheetoz vinegar chips','Cheetoz 醋味薯片',9,'Cheetoz 醋味薯片',10,1),
(11,'Cheetoz wheelsnack','Cheetoz 车轮零食',10,'Cheetoz 车轮零食',11,1),
(12,'Maz Maz ketchup chips','Maz Maz 番茄酱味薯片',11,'Maz Maz 番茄酱味薯片',12,1),
(13,'Maz Maz potato sticks','Maz Maz 土豆条',12,'Maz Maz 土豆条',13,1),
(14,'Maz Maz salty chips','Maz Maz 咸味薯片',13,'Maz Maz 咸味薯片',14,1),
(15,'Maz Maz vinegar chips','Maz Maz 醋味薯片',14,'Maz Maz 醋味薯片',15,1),
(16,'Mini Lina','Mini Lina 饼干',15,'Mini Lina 饼干',16,1),
(17,'Minoo cream biscuit','Minoo 奶油饼干',16,'Minoo 奶油饼干',17,1),
(18,'Naderi mini cookie','Naderi 迷你曲奇',17,'Naderi 迷你曲奇',18,1),
(19,'Naderi mini wafer','Naderi 迷你威化',18,'Naderi 迷你威化',19,1);"""
run("USE shop-product; " + cat_sql, "CATEGORIES")

# Products (original 19)
prod_sql = """INSERT INTO t_product (id,name,price,stock,category_id,image_url,sales) VALUES
(1,'Ashi Mashi 经典零食',12.90,500,1,'/images/products/ashi_mashi.jpg',120),
(2,'Chee pellet 番茄酱味',8.50,800,2,'/images/products/chee_ketchup.jpg',230),
(3,'Chee pellet 醋味',8.50,700,3,'/images/products/chee_vinegar.jpg',180),
(4,'Cheetoz 辣椒味薯片',10.00,600,4,'/images/products/cheetoz_chili.jpg',340),
(5,'Cheetoz 番茄酱味薯片',10.00,650,5,'/images/products/cheetoz_ketchup.jpg',410),
(6,'Cheetoz 洋葱香菜味薯片',10.50,500,6,'/images/products/cheetoz_onion.jpg',290),
(7,'Cheetoz 咸味薯片',9.50,900,7,'/images/products/cheetoz_salty.jpg',520),
(8,'Cheetoz 零食 30g',5.00,1200,8,'/images/products/cheetoz_30g.jpg',880),
(9,'Cheetoz 零食 90g',12.00,800,9,'/images/products/cheetoz_90g.jpg',760),
(10,'Cheetoz 醋味薯片',10.00,550,10,'/images/products/cheetoz_vinegar.jpg',310),
(11,'Cheetoz 车轮零食',11.50,600,11,'/images/products/cheetoz_wheel.jpg',270),
(12,'Maz Maz 番茄酱味薯片',9.80,700,12,'/images/products/maz_ketchup.jpg',330),
(13,'Maz Maz 土豆条',8.80,850,13,'/images/products/maz_sticks.jpg',450),
(14,'Maz Maz 咸味薯片',9.50,720,14,'/images/products/maz_salty.jpg',380),
(15,'Maz Maz 醋味薯片',9.80,680,15,'/images/products/maz_vinegar.jpg',300),
(16,'Mini Lina 饼干',7.50,1000,16,'/images/products/mini_lina.jpg',620),
(17,'Minoo 奶油饼干',8.00,900,17,'/images/products/minoo_biscuit.jpg',540),
(18,'Naderi 迷你曲奇',9.00,750,18,'/images/products/naderi_cookie.jpg',470),
(19,'Naderi 迷你威化',9.50,800,19,'/images/products/naderi_wafer.jpg',430);"""
run("USE shop-product; " + prod_sql, "PRODUCTS")

# Verify
r = run("USE shop-product; SELECT id, display_name, yolo_class_id FROM t_product_category ORDER BY yolo_class_id;", "VERIFY")
print(r.stdout)
