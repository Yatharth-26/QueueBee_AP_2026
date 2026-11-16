
# QueueBee – Database Normalization

## 1. Introduction

QueueBee is a campus convenience and queue-management system designed to reduce unnecessary waiting for students.

The application focuses on two main services:

1. **Canteen/Cafeteria:** Students place food orders through the application, receive an order token, and get notified when their order is ready for collection.
2. **Laundry:** Students submit laundry requests and receive notifications when their laundry is ready to collect.

The database stores student information, service points, food orders, menu items, laundry requests, status updates, and notifications.

The objective of normalization is to reduce data redundancy, prevent insertion, update and deletion anomalies, and maintain data consistency.

---

## 2. Initial Unnormalized Form (UNF)

Initially, all information could be stored in one large table called `CAMPUS_SERVICE_RECORD`.

A sample record might contain:

| Student_ID | Student_Name | Food_Order_ID | Food_Items | Quantities | Canteen_Name | Order_Status | Laundry_ID | Laundry_Status |
|---|---|---|---|---|---|---|---|---|
| S101 | Aarav | O501 | Burger, Sandwich | 1, 2 | Campus Cafe | Preparing | L701 | Ready |
| S102 | Riya | O502 | Pizza | 1 | Main Canteen | Ready | NULL | NULL |

### Problems in UNF

- Multiple food items are stored in a single field.
- Multiple quantities are stored together.
- Food order and laundry information are mixed in one record.
- Student and canteen information may be repeated.
- Updating information can require changes in multiple records.
- It becomes difficult to search and manage individual food items.

Therefore, this structure does not satisfy First Normal Form.

---

## 3. First Normal Form (1NF)

### Rule

A relation is in 1NF when:

- Every column contains atomic (indivisible) values.
- There are no repeating groups or multiple values in a single cell.
- Each row can be uniquely identified.

To achieve 1NF, food items are separated into individual rows, and student, food-order and laundry information is represented using separate relations.

### Tables in 1NF

**STUDENT**

| Student_ID (PK) | Student_Name | Email |
|---|---|---|
| S101 | Aarav | aarav@example.com |
| S102 | Riya | riya@example.com |

**FOOD_ORDER**

| Order_ID (PK) | Student_ID (FK) | Canteen_Name | Token_Number | Order_Status |
|---|---|---|---|---|
| O501 | S101 | Campus Cafe | 12 | Preparing |
| O502 | S102 | Main Canteen | 13 | Ready |

**ORDER_ITEM**

| Order_ID (PK, FK) | Item_Name (PK) | Quantity |
|---|---|---|
| O501 | Burger | 1 |
| O501 | Sandwich | 2 |
| O502 | Pizza | 1 |

**LAUNDRY_REQUEST**

| Laundry_ID (PK) | Student_ID (FK) | Laundry_Status |
|---|---|---|
| L701 | S101 | Ready |

### Functional Dependencies

- Student_ID → Student_Name, Email
- Order_ID → Student_ID, Canteen_Name, Token_Number, Order_Status
- (Order_ID, Item_Name) → Quantity
- Laundry_ID → Student_ID, Laundry_Status

### Explanation

All values are atomic and repeating groups have been removed. However, relations with composite keys may still contain partial dependencies.

We proceed to 2NF to remove those dependencies.

---

## 4. Second Normal Form (2NF)

### Rule

A relation is in 2NF when:

- It is already in 1NF.
- Every non-key attribute is fully functionally dependent on the whole candidate key.
- There are no partial dependencies on a proper subset of a candidate key.

### Identifying Partial Dependencies

Consider the following combined relation:

`ORDER_DETAILS(Order_ID, Item_Name, Student_ID, Student_Name, Canteen_Name, Quantity, Item_Price)`

Assume the primary key is `(Order_ID, Item_Name)`.

Functional dependencies:

- Order_ID → Student_ID, Student_Name, Canteen_Name
- Item_Name → Item_Price
- (Order_ID, Item_Name) → Quantity

Here:

- Student_ID, Student_Name and Canteen_Name depend only on Order_ID.
- Item_Price depends only on Item_Name.
- Quantity depends on the complete composite key.

These are partial dependencies, so the relation is not in 2NF.

### Decomposition into 2NF

We divide the relation into three tables:

**FOOD_ORDER**

| Order_ID (PK) | Student_ID | Canteen_Name |
|---|---|---|
| O501 | S101 | Campus Cafe |
| O502 | S102 | Main Canteen |

**MENU_ITEM**

| Item_ID (PK) | Item_Name | Item_Price |
|---|---|---|
| M01 | Burger | 80 |
| M02 | Sandwich | 60 |
| M03 | Pizza | 120 |

**ORDER_ITEM**

| Order_ID (PK, FK) | Item_ID (PK, FK) | Quantity |
|---|---|---|
| O501 | M01 | 1 |
| O501 | M02 | 2 |
| O502 | M03 | 1 |

### Functional Dependencies

- Order_ID → Student_ID, Canteen_Name
- Item_ID → Item_Name, Item_Price
- (Order_ID, Item_ID) → Quantity

Now, every non-key attribute depends on the complete key of its relation.

The relations satisfy 2NF.

---

## 5. Third Normal Form (3NF)

### Rule

A relation is in 3NF when:

- It is already in 2NF.
- There is no transitive dependency of non-key attributes on a candidate key.

In simple terms, non-key attributes should depend on the key, the whole key, and nothing but the key.

### Identifying Transitive Dependencies

Consider:

`STUDENT(Student_ID, Student_Name, Email, Hostel_ID, Hostel_Name)`

Functional dependencies:

- Student_ID → Student_Name, Email, Hostel_ID
- Hostel_ID → Hostel_Name

Therefore:

Student_ID → Hostel_ID → Hostel_Name

Hostel_Name depends transitively on Student_ID through Hostel_ID.

### Decomposition into 3NF

We separate independently identifiable entities into their own relations.

**STUDENT**

| Student_ID (PK) | Student_Name | Email | Hostel_ID (FK) |
|---|---|---|---|
| S101 | Aarav | aarav@example.com | H01 |
| S102 | Riya | riya@example.com | H02 |

**HOSTEL**

| Hostel_ID (PK) | Hostel_Name |
|---|---|
| H01 | Hostel A |
| H02 | Hostel B |

**SERVICE_POINT**

| Service_Point_ID (PK) | Service_Name | Service_Type | Location |
|---|---|---|---|
| SP01 | Campus Cafe | CANTEEN | Academic Block |
| SP02 | Main Canteen | CANTEEN | Central Block |
| SP03 | Campus Laundry | LAUNDRY | Hostel Block |

**MENU_ITEM**

| Item_ID (PK) | Service_Point_ID (FK) | Item_Name | Item_Price |
|---|---|---|---|
| M01 | SP01 | Burger | 80 |
| M02 | SP01 | Sandwich | 60 |
| M03 | SP02 | Pizza | 120 |

**FOOD_ORDER**

| Order_ID (PK) | Student_ID (FK) | Service_Point_ID (FK) | Token_Number | Order_Status |
|---|---|---|---|---|
| O501 | S101 | SP01 | 12 | PREPARING |
| O502 | S102 | SP02 | 13 | READY |

**ORDER_ITEM**

| Order_ID (PK, FK) | Item_ID (PK, FK) | Quantity |
|---|---|---|
| O501 | M01 | 1 |
| O501 | M02 | 2 |
| O502 | M03 | 1 |

**LAUNDRY_REQUEST**

| Laundry_ID (PK) | Student_ID (FK) | Service_Point_ID (FK) | Laundry_Status |
|---|---|---|---|
| L701 | S101 | SP03 | READY |

**STATUS_HISTORY**

| History_ID (PK) | Order_ID (FK, nullable) | Laundry_ID (FK, nullable) | Status | Updated_At |
|---|---|---|---|---|
| SH01 | O501 | NULL | PLACED | 10:00 |
| SH02 | O501 | NULL | PREPARING | 10:10 |
| SH03 | O501 | NULL | READY | 10:25 |
| SH04 | NULL | L701 | RECEIVED | 09:00 |
| SH05 | NULL | L701 | READY | 15:00 |

**NOTIFICATION**

| Notification_ID (PK) | Student_ID (FK) | Message | Is_Read |
|---|---|---|---|
| N01 | S101 | Your food order is ready | FALSE |
| N02 | S101 | Your laundry is ready for collection | FALSE |

### Functional Dependencies in the Final Design

- Student_ID → Student_Name, Email, Hostel_ID
- Hostel_ID → Hostel_Name
- Service_Point_ID → Service_Name, Service_Type, Location
- Item_ID → Service_Point_ID, Item_Name, Item_Price
- Order_ID → Student_ID, Service_Point_ID, Token_Number, Order_Status
- (Order_ID, Item_ID) → Quantity
- Laundry_ID → Student_ID, Service_Point_ID, Laundry_Status
- History_ID → Order_ID, Laundry_ID, Status, Updated_At
- Notification_ID → Student_ID, Message, Is_Read

### Why the Design Satisfies 3NF

- Student information is stored separately from orders.
- Hostel details are maintained in a separate table.
- Canteen and laundry service-point details are stored in SERVICE_POINT.
- Menu items are stored separately from food orders.
- ORDER_ITEM handles the many-to-many relationship between orders and menu items.
- Food and laundry processes have separate records and status tracking.
- Notifications are stored independently instead of being repeated in student or order records.

Every non-key attribute depends on the key, the whole key, and nothing but the key.

---

## 6. Boyce-Codd Normal Form (BCNF)

BCNF is a stronger form of 3NF.

### Rule

A relation is in BCNF if, for every non-trivial functional dependency X → Y, X is a superkey.

In the proposed QueueBee relations, the determinants of the listed functional dependencies are candidate keys or superkeys.

Therefore, the final relations are designed to satisfy BCNF as well, assuming the stated functional dependencies and candidate keys hold.

---

## 7. Conclusion

The QueueBee database was progressively normalized from an initial unnormalized structure to 1NF, 2NF and 3NF.

The final design separates students, hostels, service points, menu items, food orders, order items, laundry requests, status history and notifications.

This design reduces duplication, avoids common data anomalies and supports the core application workflows: placing food orders, tracking preparation, managing laundry requests and notifying students when their items are ready for collection.
