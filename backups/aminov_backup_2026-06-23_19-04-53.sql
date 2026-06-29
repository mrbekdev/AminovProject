-- ────────────────────────────────────────────────────────────
--
--   🗃️  AMINOV DATABASE MA'LUMOTLARI
--
-- ────────────────────────────────────────────────────────────
--   📦 Ma'lumotlar bazasi : aminov
--   📅 Sana               : 24/06/2026
--   🕐 Vaqt               : 00:04:54
--   🖥️  Server             : Ismadbeks-MacBook-Air.local
--   👤 Egasi              : Aminov Savdo Tizimi
--
-- ────────────────────────────────────────────────────────────
--   ⚠️  DIQQAT: Bu fayl maxfiy ma'lumotlarni o'z ichiga oladi!
--   Boshqa shaxslarga bermang.
-- ────────────────────────────────────────────────────────────

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AttendanceEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceEventType" AS ENUM (
    'CHECK_IN',
    'CHECK_OUT',
    'MANUAL_ADJUST'
);


--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE',
    'LEFT_EARLY'
);


--
-- Name: BranchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BranchStatus" AS ENUM (
    'ACTIVE',
    'DELETED'
);


--
-- Name: BranchType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BranchType" AS ENUM (
    'SKLAD',
    'SAVDO_MARKAZ',
    'TELEFON_MARKAZI'
);


--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentType" AS ENUM (
    'CASH',
    'CARD',
    'CREDIT',
    'INSTALLMENT',
    'TERMINAL',
    'THIRD_PARTY'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'IN_WAREHOUSE',
    'IN_STORE',
    'SOLD',
    'DEFECTIVE',
    'RETURNED',
    'CARRIER',
    'FIXED',
    'EXCHANGED'
);


--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DELIVERED'
);


--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'SALE',
    'STOCK_ADJUSTMENT',
    'TRANSFER',
    'PURCHASE',
    'RETURN',
    'WRITE_OFF',
    'DELIVERY'
);


--
-- Name: TransferStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransferStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'COMPLETED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'MANAGER',
    'CASHIER',
    'WAREHOUSE',
    'AUDITOR',
    'MARKETING',
    'OPERATOR',
    'OPERATORCALL',
    'HISOBCHI'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'DELETED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AttendanceDay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceDay" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "branchId" integer,
    date timestamp(3) without time zone NOT NULL,
    "checkInAt" timestamp(3) without time zone,
    "checkOutAt" timestamp(3) without time zone,
    "totalMinutes" integer DEFAULT 0,
    status public."AttendanceStatus" DEFAULT 'PRESENT'::public."AttendanceStatus",
    "deviceId" character varying(100),
    notes character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AttendanceDay_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AttendanceDay_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AttendanceDay_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AttendanceDay_id_seq" OWNED BY public."AttendanceDay".id;


--
-- Name: AttendanceEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceEvent" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "branchId" integer,
    "dayId" integer,
    "eventType" public."AttendanceEventType" NOT NULL,
    "occurredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deviceId" character varying(100),
    similarity double precision,
    payload jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AttendanceEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AttendanceEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AttendanceEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AttendanceEvent_id_seq" OWNED BY public."AttendanceEvent".id;


--
-- Name: Bonus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Bonus" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    amount double precision NOT NULL,
    reason text NOT NULL,
    description text,
    "bonusDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" integer NOT NULL,
    "branchId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "transactionId" integer,
    "bonusProducts" jsonb
);


--
-- Name: Bonus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Bonus_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Bonus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Bonus_id_seq" OWNED BY public."Bonus".id;


--
-- Name: Branch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Branch" (
    id integer NOT NULL,
    name text NOT NULL,
    address text,
    "cashBalance" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type public."BranchType" DEFAULT 'SAVDO_MARKAZ'::public."BranchType" NOT NULL,
    "phoneNumber" text,
    status public."BranchStatus" DEFAULT 'ACTIVE'::public."BranchStatus" NOT NULL
);


--
-- Name: Branch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Branch_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Branch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Branch_id_seq" OWNED BY public."Branch".id;


--
-- Name: CashierReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CashierReport" (
    id integer NOT NULL,
    "cashierId" integer NOT NULL,
    "branchId" integer NOT NULL,
    "reportDate" timestamp(3) without time zone NOT NULL,
    "cashTotal" double precision DEFAULT 0 NOT NULL,
    "cardTotal" double precision DEFAULT 0 NOT NULL,
    "creditTotal" double precision DEFAULT 0 NOT NULL,
    "installmentTotal" double precision DEFAULT 0 NOT NULL,
    "upfrontTotal" double precision DEFAULT 0 NOT NULL,
    "upfrontCash" double precision DEFAULT 0 NOT NULL,
    "upfrontCard" double precision DEFAULT 0 NOT NULL,
    "soldQuantity" integer DEFAULT 0 NOT NULL,
    "soldAmount" double precision DEFAULT 0 NOT NULL,
    "repaymentTotal" double precision DEFAULT 0 NOT NULL,
    "defectivePlus" double precision DEFAULT 0 NOT NULL,
    "defectiveMinus" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CashierReport_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CashierReport_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CashierReport_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CashierReport_id_seq" OWNED BY public."CashierReport".id;


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Category" (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(255),
    "branchId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- Name: CreditRepayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CreditRepayment" (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    "scheduleId" integer,
    amount double precision NOT NULL,
    channel text DEFAULT 'CASH'::text NOT NULL,
    month text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paidByUserId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "monthNumber" integer,
    "branchId" integer
);


--
-- Name: CreditRepayment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CreditRepayment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CreditRepayment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CreditRepayment_id_seq" OWNED BY public."CreditRepayment".id;


--
-- Name: CurrencyExchangeRate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CurrencyExchangeRate" (
    id integer NOT NULL,
    "fromCurrency" text DEFAULT 'USD'::text NOT NULL,
    "toCurrency" text DEFAULT 'UZS'::text NOT NULL,
    rate double precision NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "branchId" integer,
    "createdBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CurrencyExchangeRate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CurrencyExchangeRate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CurrencyExchangeRate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CurrencyExchangeRate_id_seq" OWNED BY public."CurrencyExchangeRate".id;


--
-- Name: Customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Customer" (
    id integer NOT NULL,
    "fullName" text NOT NULL,
    phone text NOT NULL,
    email text,
    address text,
    "passportSeries" text,
    jshshir text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Customer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Customer_id_seq" OWNED BY public."Customer".id;


--
-- Name: DailyExpense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DailyExpense" (
    id integer NOT NULL,
    amount double precision NOT NULL,
    reason text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DailyExpense_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DailyExpense_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DailyExpense_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DailyExpense_id_seq" OWNED BY public."DailyExpense".id;


--
-- Name: DailyRepayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DailyRepayment" (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    amount double precision NOT NULL,
    channel text DEFAULT 'CASH'::text NOT NULL,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paidByUserId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "branchId" integer
);


--
-- Name: DailyRepayment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DailyRepayment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DailyRepayment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DailyRepayment_id_seq" OWNED BY public."DailyRepayment".id;


--
-- Name: DriverRating; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DriverRating" (
    id integer NOT NULL,
    "driverId" integer NOT NULL,
    "transactionId" integer NOT NULL,
    rating integer NOT NULL,
    "ratedBy" integer NOT NULL,
    "ratedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DriverRating_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DriverRating_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DriverRating_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DriverRating_id_seq" OWNED BY public."DriverRating".id;


--
-- Name: FaceTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FaceTemplate" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "deviceId" character varying(100),
    template text,
    vector jsonb,
    "imageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FaceTemplate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."FaceTemplate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FaceTemplate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."FaceTemplate_id_seq" OWNED BY public."FaceTemplate".id;


--
-- Name: GlobalRate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GlobalRate" (
    id integer NOT NULL,
    value double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: GlobalRate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."GlobalRate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: GlobalRate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."GlobalRate_id_seq" OWNED BY public."GlobalRate".id;


--
-- Name: PaymentRepayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentRepayment" (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    "scheduleId" integer NOT NULL,
    amount double precision NOT NULL,
    channel text DEFAULT 'CASH'::text NOT NULL,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paidByUserId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PaymentRepayment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PaymentRepayment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PaymentRepayment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PaymentRepayment_id_seq" OWNED BY public."PaymentRepayment".id;


--
-- Name: PaymentSchedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentSchedule" (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    month integer NOT NULL,
    payment double precision NOT NULL,
    "remainingBalance" double precision NOT NULL,
    "isPaid" boolean DEFAULT false NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "creditRepaymentAmount" double precision DEFAULT 0,
    "repaymentDate" timestamp(3) without time zone,
    "paidByUserId" integer,
    "paidChannel" text,
    rating text,
    "daysCount" integer,
    "dueDate" timestamp(3) without time zone,
    "isDailyInstallment" boolean DEFAULT false NOT NULL,
    "installmentType" text,
    "remainingDays" integer,
    "remainingMonths" integer,
    "totalDays" integer,
    "totalMonths" integer
);


--
-- Name: PaymentSchedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PaymentSchedule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PaymentSchedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PaymentSchedule_id_seq" OWNED BY public."PaymentSchedule".id;


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id integer NOT NULL,
    name text NOT NULL,
    barcode text,
    model text,
    price double precision NOT NULL,
    quantity integer NOT NULL,
    "defectiveQuantity" integer DEFAULT 0 NOT NULL,
    "returnedQuantity" integer DEFAULT 0 NOT NULL,
    "exchangedQuantity" integer DEFAULT 0 NOT NULL,
    "initialQuantity" integer DEFAULT 0 NOT NULL,
    status public."ProductStatus" DEFAULT 'IN_STORE'::public."ProductStatus" NOT NULL,
    "branchId" integer NOT NULL,
    "categoryId" integer NOT NULL,
    "marketPrice" double precision,
    "deletedAt" timestamp(3) without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "bonusPercentage" double precision DEFAULT 0,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) without time zone,
    months text
);


--
-- Name: ProductTransfer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductTransfer" (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    "fromBranchId" integer NOT NULL,
    "toBranchId" integer NOT NULL,
    quantity integer NOT NULL,
    status public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    "initiatedById" integer NOT NULL,
    "approvedById" integer,
    "transferDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductTransfer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProductTransfer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductTransfer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProductTransfer_id_seq" OWNED BY public."ProductTransfer".id;


--
-- Name: Product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Product_id_seq" OWNED BY public."Product".id;


--
-- Name: Task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Task" (
    id integer NOT NULL,
    "auditorId" integer,
    "transactionId" integer NOT NULL,
    status public."TaskStatus" DEFAULT 'PENDING'::public."TaskStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isUydanCollected" boolean DEFAULT false NOT NULL,
    "uydanAmount" double precision DEFAULT 0 NOT NULL,
    "uydanCollectNote" text,
    "uydanCollectedAt" timestamp(3) without time zone,
    "uydanCollectedById" integer,
    "uydanCollectedAmount" double precision DEFAULT 0 NOT NULL
);


--
-- Name: Task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Task_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Task_id_seq" OWNED BY public."Task".id;


--
-- Name: Transaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Transaction" (
    id integer NOT NULL,
    "customerId" integer,
    "userId" integer,
    "soldByUserId" integer,
    "fromBranchId" integer,
    "toBranchId" integer,
    type public."TransactionType" NOT NULL,
    "transactionType" text,
    status public."TransactionStatus" DEFAULT 'PENDING'::public."TransactionStatus" NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    "finalTotal" double precision NOT NULL,
    "paymentType" public."PaymentType",
    "deliveryMethod" text,
    "deliveryType" text,
    "deliveryAddress" text,
    "amountPaid" double precision,
    "downPayment" double precision,
    "remainingBalance" double precision,
    "receiptId" text,
    description text,
    "creditRepaymentAmount" double precision DEFAULT 0,
    "lastRepaymentDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "upfrontPaymentType" text,
    "termUnit" text,
    days integer,
    months integer,
    "extraProfit" double precision DEFAULT 0,
    "updatedById" integer
);


--
-- Name: TransactionBonusProduct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransactionBonusProduct" (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    "productId" integer NOT NULL,
    quantity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TransactionBonusProduct_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TransactionBonusProduct_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TransactionBonusProduct_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TransactionBonusProduct_id_seq" OWNED BY public."TransactionBonusProduct".id;


--
-- Name: TransactionItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransactionItem" (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    "productId" integer,
    quantity integer NOT NULL,
    price double precision NOT NULL,
    total double precision NOT NULL,
    "creditMonth" integer,
    "creditPercent" double precision,
    "monthlyPayment" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "originalPrice" double precision,
    "sellingPrice" double precision,
    status text
);


--
-- Name: TransactionItem_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TransactionItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TransactionItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TransactionItem_id_seq" OWNED BY public."TransactionItem".id;


--
-- Name: TransactionPayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransactionPayment" (
    id integer NOT NULL,
    "transactionId" integer NOT NULL,
    method text NOT NULL,
    amount double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TransactionPayment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TransactionPayment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TransactionPayment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TransactionPayment_id_seq" OWNED BY public."TransactionPayment".id;


--
-- Name: Transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Transaction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Transaction_id_seq" OWNED BY public."Transaction".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    "firstName" text,
    "lastName" text,
    phone text,
    username text NOT NULL,
    password text,
    role public."UserRole" NOT NULL,
    "branchId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "workEndTime" character varying(5),
    "workStartTime" character varying(5),
    "workShift" text DEFAULT 'DAY'::text
);


--
-- Name: UserBranchAccess; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserBranchAccess" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "branchId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserBranchAccess_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."UserBranchAccess_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: UserBranchAccess_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UserBranchAccess_id_seq" OWNED BY public."UserBranchAccess".id;


--
-- Name: UserLocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserLocation" (
    "userId" integer NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    address text,
    "isOnline" boolean DEFAULT false NOT NULL,
    "lastSeen" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: WorkSchedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkSchedule" (
    id integer NOT NULL,
    "workStartTime" character varying(5) NOT NULL,
    "workEndTime" character varying(5) NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    description character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WorkSchedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."WorkSchedule_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: WorkSchedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."WorkSchedule_id_seq" OWNED BY public."WorkSchedule".id;


--
-- Name: barcodeCounter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."barcodeCounter" (
    id integer NOT NULL,
    counter bigint DEFAULT 1000000000 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: barcodeCounter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."barcodeCounter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: barcodeCounter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."barcodeCounter_id_seq" OWNED BY public."barcodeCounter".id;


--
-- Name: defective_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.defective_logs (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    quantity integer NOT NULL,
    description text NOT NULL,
    "userId" integer,
    "branchId" integer,
    "cashAmount" double precision DEFAULT 0 NOT NULL,
    "actionType" text DEFAULT 'DEFECTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "exchangeWithProductId" integer,
    "replacementQuantity" integer,
    "replacementTransactionId" integer,
    "replacementUnitPrice" double precision,
    "cashAdjustmentDirection" text,
    "handledByUserId" integer,
    "transactionId" integer
);


--
-- Name: defective_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.defective_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: defective_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.defective_logs_id_seq OWNED BY public.defective_logs.id;


--
-- Name: AttendanceDay id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay" ALTER COLUMN id SET DEFAULT nextval('public."AttendanceDay_id_seq"'::regclass);


--
-- Name: AttendanceEvent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent" ALTER COLUMN id SET DEFAULT nextval('public."AttendanceEvent_id_seq"'::regclass);


--
-- Name: Bonus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bonus" ALTER COLUMN id SET DEFAULT nextval('public."Bonus_id_seq"'::regclass);


--
-- Name: Branch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Branch" ALTER COLUMN id SET DEFAULT nextval('public."Branch_id_seq"'::regclass);


--
-- Name: CashierReport id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashierReport" ALTER COLUMN id SET DEFAULT nextval('public."CashierReport_id_seq"'::regclass);


--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: CreditRepayment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditRepayment" ALTER COLUMN id SET DEFAULT nextval('public."CreditRepayment_id_seq"'::regclass);


--
-- Name: CurrencyExchangeRate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CurrencyExchangeRate" ALTER COLUMN id SET DEFAULT nextval('public."CurrencyExchangeRate_id_seq"'::regclass);


--
-- Name: Customer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer" ALTER COLUMN id SET DEFAULT nextval('public."Customer_id_seq"'::regclass);


--
-- Name: DailyExpense id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyExpense" ALTER COLUMN id SET DEFAULT nextval('public."DailyExpense_id_seq"'::regclass);


--
-- Name: DailyRepayment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyRepayment" ALTER COLUMN id SET DEFAULT nextval('public."DailyRepayment_id_seq"'::regclass);


--
-- Name: DriverRating id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DriverRating" ALTER COLUMN id SET DEFAULT nextval('public."DriverRating_id_seq"'::regclass);


--
-- Name: FaceTemplate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FaceTemplate" ALTER COLUMN id SET DEFAULT nextval('public."FaceTemplate_id_seq"'::regclass);


--
-- Name: GlobalRate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GlobalRate" ALTER COLUMN id SET DEFAULT nextval('public."GlobalRate_id_seq"'::regclass);


--
-- Name: PaymentRepayment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentRepayment" ALTER COLUMN id SET DEFAULT nextval('public."PaymentRepayment_id_seq"'::regclass);


--
-- Name: PaymentSchedule id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentSchedule" ALTER COLUMN id SET DEFAULT nextval('public."PaymentSchedule_id_seq"'::regclass);


--
-- Name: Product id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product" ALTER COLUMN id SET DEFAULT nextval('public."Product_id_seq"'::regclass);


--
-- Name: ProductTransfer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTransfer" ALTER COLUMN id SET DEFAULT nextval('public."ProductTransfer_id_seq"'::regclass);


--
-- Name: Task id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task" ALTER COLUMN id SET DEFAULT nextval('public."Task_id_seq"'::regclass);


--
-- Name: Transaction id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction" ALTER COLUMN id SET DEFAULT nextval('public."Transaction_id_seq"'::regclass);


--
-- Name: TransactionBonusProduct id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionBonusProduct" ALTER COLUMN id SET DEFAULT nextval('public."TransactionBonusProduct_id_seq"'::regclass);


--
-- Name: TransactionItem id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionItem" ALTER COLUMN id SET DEFAULT nextval('public."TransactionItem_id_seq"'::regclass);


--
-- Name: TransactionPayment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionPayment" ALTER COLUMN id SET DEFAULT nextval('public."TransactionPayment_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserBranchAccess id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBranchAccess" ALTER COLUMN id SET DEFAULT nextval('public."UserBranchAccess_id_seq"'::regclass);


--
-- Name: WorkSchedule id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkSchedule" ALTER COLUMN id SET DEFAULT nextval('public."WorkSchedule_id_seq"'::regclass);


--
-- Name: barcodeCounter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."barcodeCounter" ALTER COLUMN id SET DEFAULT nextval('public."barcodeCounter_id_seq"'::regclass);


--
-- Name: defective_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defective_logs ALTER COLUMN id SET DEFAULT nextval('public.defective_logs_id_seq'::regclass);


--
-- Data for Name: AttendanceDay; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceDay" (id, "userId", "branchId", date, "checkInAt", "checkOutAt", "totalMinutes", status, "deviceId", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AttendanceEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AttendanceEvent" (id, "userId", "branchId", "dayId", "eventType", "occurredAt", "deviceId", similarity, payload, "createdAt") FROM stdin;
\.


--
-- Data for Name: Bonus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Bonus" (id, "userId", amount, reason, description, "bonusDate", "createdById", "branchId", "createdAt", "updatedAt", "transactionId", "bonusProducts") FROM stdin;
1	2	50000	Яхши иш учун	ferwgweg	2025-09-19 00:00:00	2	2	2025-09-19 21:08:32.492	2025-09-19 21:08:32.492	\N	\N
2	2	100000	vdvsd	sdvsdv	2025-09-20 00:00:00	2	2	2025-09-19 21:15:12.149	2025-09-19 21:15:12.149	\N	\N
3	7	5000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 300000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 22:36:43.692	7	1	2025-09-19 22:36:43.694	2025-09-19 22:36:43.694	\N	\N
4	7	12000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 400000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 22:39:21.962	7	1	2025-09-19 22:39:21.963	2025-09-19 22:39:21.963	\N	\N
5	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 22:45:07.905	7	1	2025-09-19 22:45:07.906	2025-09-19 22:45:07.906	\N	\N
6	7	48000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1000000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 23:02:14.713	6	1	2025-09-19 23:02:14.714	2025-09-19 23:02:14.714	\N	\N
7	7	6000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 300000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 23:03:20.026	6	1	2025-09-19 23:03:20.027	2025-09-19 23:03:20.027	\N	\N
8	7	6000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 300000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 23:07:26.378	6	1	2025-09-19 23:07:26.379	2025-09-19 23:07:26.379	\N	\N
9	7	50000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1500000 som, Bozor narxi: 1000000 som, Miqdor: 1	2025-09-19 23:07:26.386	6	1	2025-09-19 23:07:26.388	2025-09-19 23:07:26.388	\N	\N
10	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 23:08:32.573	6	1	2025-09-19 23:08:32.574	2025-09-19 23:08:32.574	\N	\N
11	7	50000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1500000 som, Bozor narxi: 1000000 som, Miqdor: 1	2025-09-19 23:08:32.579	6	1	2025-09-19 23:08:32.58	2025-09-19 23:08:32.58	\N	\N
12	7	42000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 900000 som, Bozor narxi: 200000 som, Miqdor: 1	2025-09-19 23:10:30.145	6	1	2025-09-19 23:10:30.146	2025-09-19 23:10:30.146	\N	\N
13	7	12000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 400000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus foizi: 6%	2025-09-20 20:55:55.694	6	1	2025-09-20 20:55:55.696	2025-09-20 20:55:55.696	\N	\N
14	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus foizi: 6%	2025-09-20 21:27:42.278	6	1	2025-09-20 21:27:42.279	2025-09-20 21:27:42.279	\N	\N
15	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus foizi: 6%	2025-09-20 21:28:41.089	6	1	2025-09-20 21:28:41.09	2025-09-20 21:28:41.09	\N	\N
16	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus foizi: 6%	2025-09-20 21:44:06.513	6	1	2025-09-20 21:44:06.514	2025-09-20 21:44:06.514	\N	\N
17	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus foizi: 6%	2025-09-20 21:50:42.611	6	1	2025-09-20 21:50:42.612	2025-09-20 21:50:42.612	\N	\N
18	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus foizi: 6%	2025-09-20 21:59:17.886	6	1	2025-09-20 21:59:17.887	2025-09-20 21:59:17.887	\N	\N
19	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 0 som, Sof ortiqcha: 300,000 som, Bonus foizi: 6%	2025-09-21 11:22:00.71	6	1	2025-09-21 11:22:00.712	2025-09-21 11:22:00.712	\N	\N
20	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 0 som, Sof ortiqcha: 300,000 som, Bonus foizi: 6%	2025-09-21 11:25:56.44	6	1	2025-09-21 11:25:56.441	2025-09-21 11:25:56.441	\N	\N
21	7	18000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 0 som, Sof ortiqcha: 300,000 som, Bonus foizi: 6%	2025-09-21 11:29:54.454	6	1	2025-09-21 11:29:54.455	2025-09-21 11:29:54.455	\N	\N
22	7	48000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1000000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 0 som, Sof ortiqcha: 800,000 som, Bonus foizi: 6%	2025-09-21 11:37:41.364	6	1	2025-09-21 11:37:41.366	2025-09-21 11:37:41.366	\N	\N
23	7	12000	SALES_BONUS	asdf mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 500000 som, Bozor narxi: 200000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 100,000 som, Sof ortiqcha: 200,000 som, Bonus foizi: 6%	2025-09-21 11:42:01.485	6	1	2025-09-21 11:42:01.487	2025-09-21 11:42:01.487	\N	\N
24	7	70000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 2000000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 300,000 som, Sof ortiqcha: 700,000 som, Bonus foizi: 10%	2025-09-21 16:15:07.79	6	1	2025-09-21 16:15:07.792	2025-09-21 16:15:07.792	\N	\N
25	7	40000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1500000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 100,000 som, Sof ortiqcha: 400,000 som, Bonus foizi: 10%	2025-09-21 18:06:42.751	6	1	2025-09-21 18:06:42.754	2025-09-21 18:06:42.754	\N	\N
26	7	30000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1500000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 200,000 som, Sof ortiqcha: 300,000 som, Bonus foizi: 10%	2025-09-22 18:27:50.961	6	1	2025-09-22 18:27:50.965	2025-09-22 18:27:50.965	\N	\N
27	7	30000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1500000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 200,000 som, Sof ortiqcha: 300,000 som, Bonus foizi: 10%	2025-09-23 18:29:47.052	6	1	2025-09-23 18:29:47.054	2025-09-23 18:29:47.054	\N	\N
28	7	30000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 1500000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 200,000 som, Sof ortiqcha: 300,000 som, Bonus foizi: 10%	2025-09-23 18:35:28.357	6	1	2025-09-23 18:35:28.359	2025-09-23 18:35:28.359	\N	\N
29	7	80000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Sotish narxi: 2000000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 200,000 som, Sof ortiqcha: 800,000 som, Bonus foizi: 10%	2025-09-23 18:41:13.231	6	1	2025-09-23 18:41:13.232	2025-09-23 18:41:13.232	\N	\N
34	7	12000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 67, Sotish narxi: 400,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 100,000 som, Ajratilgan ulush: 100,000 som, Sof ortiqcha: 200,000 som, Bonus foizi: 6%	2025-10-31 09:08:47.335	2	1	2025-10-31 09:08:47.337	2025-10-31 09:08:47.337	\N	[{"price": 100000, "quantity": 1, "productId": 4, "totalValue": 100000, "productCode": "1", "productName": "asdf", "productModel": "Salom"}]
41	7	50000	test	test	2025-11-12 00:00:00	2	1	2025-11-12 19:55:01.841	2025-11-12 19:55:01.841	\N	\N
42	7	-50000	test	test	2025-11-12 00:00:00	2	1	2025-11-12 19:56:43.137	2025-11-12 19:56:43.137	\N	\N
30	7	70000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Transaction ID: 53, Sotish narxi: 2000000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 300,000 som, Sof ortiqcha: 700,000 som, Bonus foizi: 10%	2025-09-23 18:54:45.182	6	1	2025-09-23 18:54:45.184	2025-09-23 19:16:52.687	\N	[{"price": 10, "quantity": 3, "productId": 1, "totalValue": 300000, "productCode": "1", "productName": "asdf"}, {"price": 111111, "quantity": 1, "productId": null, "totalValue": 111111, "productCode": "", "productName": "deeded"}]
31	7	50000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Transaction ID: 55, Sotish narxi: 1500000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2025-09-23 21:46:27.158	6	1	2025-09-23 21:46:27.16	2025-09-23 21:46:27.16	\N	null
32	7	70000	SALES_BONUS	v mahsulotini yuqori narxda sotgani uchun avtomatik bonus. Transaction ID: 56, Sotish narxi: 2000000 som, Bozor narxi: 1000000 som, Miqdor: 1, Bonus mahsulotlar qiymati: 300,000 som, Sof ortiqcha: 700,000 som, Bonus foizi: 10%	2025-09-24 06:40:42.832	6	1	2025-09-24 06:40:42.834	2025-09-24 06:40:42.834	\N	[{"price": 100000, "quantity": 3, "productId": 1, "totalValue": 300000, "productCode": "1", "productName": "asdf"}]
33	7	150000	SALES_BONUS	v mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 57, Sotish narxi: 1000000 som, Kelish narxi: 500000 som, Miqdor: 3, Bonus mahsulotlar qiymati: 0 som, Sof ortiqcha: 1,500,000 som, Bonus foizi: 10%	2025-10-25 18:44:26.086	6	1	2025-10-25 18:44:26.087	2025-10-25 18:44:26.087	\N	null
35	7	-430000	SALES_PENALTY	Arzon (kelish narxidan past) sotuv uchun umumiy jarima. Transaction ID: 68. Umumiy sotish: 2,000,000 som, Bonus mahsulotlar qiymati: 100,000 som, Umumiy kelish: 2,330,000 som, Jami kamomad: 430,000 som. Tafsilotlar: e3e23e (rrr) qty=1, sotish=2000000, kelish=2330000, zarar=330000	2025-10-31 09:17:05.182	2	1	2025-10-31 09:17:05.183	2025-10-31 09:17:05.183	\N	null
75	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 110, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-02-13 19:20:03.304	15	1	2026-02-13 19:20:03.306	2026-02-13 19:20:03.306	110	null
76	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 111, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-02-13 19:25:35.961	15	1	2026-02-13 19:25:35.962	2026-02-13 19:25:35.962	111	null
99	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 243, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 16:03:55.51	15	1	2026-04-23 16:03:55.511	2026-04-23 16:03:55.511	243	null
105	7	25000	SALES_BONUS	TEST11 (TEST11) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 249, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 22:14:55.336	15	1	2026-04-23 22:14:55.338	2026-04-23 22:14:55.338	\N	null
103	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 247, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 21:37:12.9	15	1	2026-04-23 21:37:12.901	2026-04-23 21:37:12.901	\N	null
104	7	25000	SALES_BONUS	TEST11 (TEST11) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 248, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 22:13:58.131	15	1	2026-04-23 22:13:58.133	2026-04-23 22:13:58.133	\N	null
102	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 246, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 21:31:27.014	15	1	2026-04-23 21:31:27.016	2026-04-23 21:31:27.016	\N	null
101	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 245, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 20:45:18.052	15	1	2026-04-23 20:45:18.053	2026-04-23 20:45:18.053	\N	null
36	7	343400	SALES_BONUS	e3e23e (rrr) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 69, Sotish narxi: 3,440,000 som, Kelish narxi: 2,330,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 100,000 som, Ajratilgan ulush: 100,000 som, Sof ortiqcha: 1,010,000 som, Bonus foizi: 34%	2025-10-31 11:10:42.809	2	2	2025-10-31 11:10:42.81	2025-10-31 11:10:42.81	\N	[{"price": 100000, "quantity": 1, "productId": 1, "totalValue": 100000, "productCode": "1", "productName": "asdf", "productModel": "Salom"}]
37	7	-730000	SALES_PENALTY	Arzon (kelish narxidan past) sotuv uchun umumiy jarima. Transaction ID: 70. Umumiy sotish: 2,100,000 som, Bonus mahsulotlar qiymati: 500,000 som, Umumiy kelish: 2,330,000 som, Jami kamomad: 730,000 som. Tafsilotlar: e3e23e (rrr) qty=1, sotish=2100000, kelish=2330000, zarar=230000	2025-10-31 11:13:28.754	2	2	2025-10-31 11:13:28.756	2025-10-31 11:13:28.756	\N	[{"price": 500000, "quantity": 1, "productId": 2, "totalValue": 500000, "productCode": "2", "productName": "v", "productModel": "fffffff"}]
38	7	-730000	SALES_PENALTY	Arzon (kelish narxidan past) sotuv uchun umumiy jarima. Transaction ID: 71. Umumiy sotish: 2,100,000 som, Bonus mahsulotlar qiymati: 500,000 som, Umumiy kelish: 2,330,000 som, Jami kamomad: 730,000 som. Tafsilotlar: e3e23e (rrr) qty=1, sotish=2100000, kelish=2330000, zarar=230000	2025-10-31 11:23:54.971	2	2	2025-10-31 11:23:54.973	2025-10-31 11:23:54.973	\N	[{"price": 500000, "quantity": 1, "productId": 2, "totalValue": 500000, "productCode": "2", "productName": "v", "productModel": "fffffff"}]
39	7	-1130000	SALES_PENALTY	Arzon (kelish narxidan past) sotuv uchun umumiy jarima. Transaction ID: 72. Umumiy sotish: 2,000,000 som, Bonus mahsulotlar qiymati: 800,000 som, Umumiy kelish: 2,330,000 som, Jami kamomad: 1,130,000 som. Tafsilotlar: e3e23e (rrr) qty=1, sotish=2000000, kelish=2330000, zarar=330000	2025-10-31 11:27:41.29	2	2	2025-10-31 11:27:41.292	2025-10-31 11:27:41.292	\N	[{"price": 100000, "quantity": 3, "productId": 1, "totalValue": 300000, "productCode": "1", "productName": "asdf", "productModel": "Salom"}, {"price": 500000, "quantity": 1, "productId": 2, "totalValue": 500000, "productCode": "2", "productName": "v", "productModel": "fffffff"}]
40	7	6000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 73, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 100,000 som, Bonus foizi: 6%	2025-11-12 18:34:47.141	6	1	2025-11-12 18:34:47.143	2025-11-12 18:34:47.143	\N	null
48	7	6000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 80, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 100,000 som, Bonus foizi: 6%	2025-11-14 17:43:50.528	6	1	2025-11-14 17:43:50.53	2025-11-14 17:43:50.53	\N	null
55	7	6000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 87, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 100,000 som, Bonus foizi: 6%	2025-11-23 14:00:44.465	6	1	2025-11-23 14:00:44.466	2025-11-23 14:00:44.466	\N	null
56	7	6000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 88, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 100,000 som, Bonus foizi: 6%	2025-11-23 14:05:07.494	6	1	2025-11-23 14:05:07.495	2025-11-23 14:05:07.495	\N	null
57	7	6000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 89, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 100,000 som, Bonus foizi: 6%	2025-11-23 14:28:18.039	6	1	2025-11-23 14:28:18.041	2025-11-23 14:28:18.041	\N	null
59	7	6000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 91, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 100,000 som, Bonus foizi: 6%	2025-11-23 15:08:35.776	6	1	2025-11-23 15:08:35.778	2025-11-23 15:08:35.778	91	null
63	7	6000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 95, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 100,000 som, Bonus foizi: 6%	2025-11-28 10:49:50.617	6	1	2025-11-28 10:49:50.618	2025-11-28 10:49:50.618	95	null
68	7	12000	SALES_BONUS	asdf (Salom) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 103, Sotish narxi: 200,000 som, Kelish narxi: 100,000 som, Miqdor: 2, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 200,000 som, Bonus foizi: 6%	2026-01-30 17:51:04.837	6	1	2026-01-30 17:51:04.839	2026-01-30 17:51:04.839	103	null
69	7	377400	SALES_BONUS	e3e23e (rrr) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 104, Sotish narxi: 3,440,000 som, Kelish narxi: 2,330,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 1,110,000 som, Bonus foizi: 34%	2026-01-30 17:58:53.927	6	1	2026-01-30 17:58:53.929	2026-01-30 17:58:53.929	104	null
70	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 105, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-02-12 20:03:25.826	15	1	2026-02-12 20:03:25.828	2026-02-12 20:03:25.828	105	null
71	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 106, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-02-13 18:35:50.189	15	1	2026-02-13 18:35:50.191	2026-02-13 18:35:50.191	106	null
72	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 107, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-02-13 18:39:19.057	15	1	2026-02-13 18:39:19.058	2026-02-13 18:39:19.058	107	null
73	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 108, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-02-13 18:42:39.091	15	1	2026-02-13 18:42:39.093	2026-02-13 18:42:39.093	108	null
74	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 109, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-02-13 18:53:14.105	15	1	2026-02-13 18:53:14.107	2026-02-13 18:53:14.107	109	null
78	7	137000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 124, Sotish narxi: 2,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 130,000 som, Ajratilgan ulush: 130,000 som, Sof ortiqcha: 1,370,000 som, Bonus foizi: 10%	2026-04-06 18:10:49.662	6	1	2026-04-06 18:10:49.664	2026-04-06 18:10:49.664	124	[{"price": 130000, "quantity": 1, "productId": 12, "totalValue": 130000, "productCode": "6", "productName": "Bek", "productModel": "Bek"}]
80	7	50000	SALES_BONUS	v (fffffff) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 125, Sotish narxi: 1,000,000 som, Kelish narxi: 500,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 10%	2026-04-06 18:14:02.019	6	1	2026-04-06 18:14:02.021	2026-04-06 18:14:02.021	125	null
81	7	2200	SALES_BONUS	Bek (Bek) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 126, Sotish narxi: 150,000 som, Kelish narxi: 130,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 20,000 som, Bonus foizi: 11%	2026-04-06 18:41:02.76	6	1	2026-04-06 18:41:02.763	2026-04-06 18:41:02.763	126	null
82	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 226, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-20 15:27:19.049	15	1	2026-04-20 15:27:19.05	2026-04-20 15:27:19.05	226	null
83	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 227, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-20 15:49:10.157	15	1	2026-04-20 15:49:10.159	2026-04-20 15:49:10.159	227	null
84	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 228, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-20 15:56:04.142	15	1	2026-04-20 15:56:04.143	2026-04-20 15:56:04.143	228	null
85	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 229, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-20 16:00:27.194	15	1	2026-04-20 16:00:27.196	2026-04-20 16:00:27.196	229	null
86	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 230, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 14:03:57.242	15	1	2026-04-21 14:03:57.244	2026-04-21 14:03:57.244	230	null
87	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 231, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 15:33:07.728	15	1	2026-04-21 15:33:07.729	2026-04-21 15:33:07.729	231	null
88	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 232, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 15:35:31.435	15	1	2026-04-21 15:35:31.436	2026-04-21 15:35:31.436	232	null
89	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 233, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 15:36:26.943	15	1	2026-04-21 15:36:26.944	2026-04-21 15:36:26.944	233	null
90	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 234, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 15:48:05.781	15	1	2026-04-21 15:48:05.783	2026-04-21 15:48:05.783	234	null
91	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 235, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 15:52:45.895	15	1	2026-04-21 15:52:45.897	2026-04-21 15:52:45.897	235	null
92	7	25000	SALES_BONUS	TEST1 (TEST1) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 236, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 15:58:20.64	15	1	2026-04-21 15:58:20.641	2026-04-21 15:58:20.641	236	null
93	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 237, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 16:28:54.182	15	1	2026-04-21 16:28:54.184	2026-04-21 16:28:54.184	237	null
94	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 238, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-21 16:32:04.691	15	1	2026-04-21 16:32:04.692	2026-04-21 16:32:04.692	238	null
95	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 239, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-22 15:07:51.854	15	1	2026-04-22 15:07:51.855	2026-04-22 15:07:51.855	239	null
96	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 240, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-22 15:09:05.157	15	1	2026-04-22 15:09:05.158	2026-04-22 15:09:05.158	240	null
97	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 241, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-22 15:10:46.823	15	1	2026-04-22 15:10:46.824	2026-04-22 15:10:46.824	241	null
98	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 242, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 16:01:55.474	15	1	2026-04-23 16:01:55.476	2026-04-23 16:01:55.476	242	null
100	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 244, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-23 20:36:08.184	15	1	2026-04-23 20:36:08.185	2026-04-23 20:36:08.185	\N	null
106	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 254, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-24 18:11:59.785	15	1	2026-04-24 18:11:59.786	2026-04-24 18:11:59.786	254	null
107	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 255, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-24 18:13:50.637	15	1	2026-04-24 18:13:50.638	2026-04-24 18:13:50.638	255	null
108	7	25000	SALES_BONUS	TEST11 (TEST11) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 255, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-24 18:13:50.649	15	1	2026-04-24 18:13:50.65	2026-04-24 18:13:50.65	255	null
109	7	25000	SALES_BONUS	TEST12 (TEST12) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 255, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-24 18:13:50.652	15	1	2026-04-24 18:13:50.653	2026-04-24 18:13:50.653	255	null
110	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 256, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-25 19:59:22.146	15	1	2026-04-25 19:59:22.148	2026-04-25 19:59:22.148	256	null
111	7	25000	SALES_BONUS	TEST10 (TEST10) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 257, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-25 20:03:30.056	15	1	2026-04-25 20:03:30.057	2026-04-25 20:03:30.057	257	null
112	7	25000	SALES_BONUS	TEST11 (TEST11) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 258, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-27 19:17:49.596	15	1	2026-04-27 19:17:49.598	2026-04-27 19:17:49.598	258	null
113	7	25000	SALES_BONUS	TEST11 (TEST11) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 259, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-27 19:20:05.333	15	1	2026-04-27 19:20:05.334	2026-04-27 19:20:05.334	259	null
114	7	25000	SALES_BONUS	TEST11 (TEST11) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 260, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-04-27 19:41:50.76	15	1	2026-04-27 19:41:50.762	2026-04-27 19:41:50.762	260	null
115	7	25000	SALES_BONUS	TEST11 (TEST11) mahsulotini kelish narxidan yuqori bahoda sotgani uchun avtomatik bonus. Transaction ID: 261, Sotish narxi: 1,500,000 som, Kelish narxi: 1,000,000 som, Miqdor: 1, Bonus mahsulotlar umumiy qiymati: 0 som, Ajratilgan ulush: 0 som, Sof ortiqcha: 500,000 som, Bonus foizi: 5%	2026-05-13 17:59:40.414	15	1	2026-05-13 17:59:40.415	2026-05-13 17:59:40.415	261	null
116	19	100000	Sabab	Sabab	2026-06-18 00:00:00	2	3	2026-06-18 14:12:59.583	2026-06-18 14:12:59.583	\N	\N
\.


--
-- Data for Name: Branch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Branch" (id, name, address, "cashBalance", "createdAt", "updatedAt", type, "phoneNumber", status) FROM stdin;
3	Telefon	Postage	0	2025-09-23 20:10:33.862	2025-09-23 20:10:33.862	TELEFON_MARKAZI	\N	ACTIVE
5	Postgay	Gurlan	0	2026-06-19 10:22:14.791	2026-06-19 10:22:14.791	SAVDO_MARKAZ	\N	ACTIVE
2	Aminov	\N	2187500	2025-09-19 20:24:24.606	2026-06-19 14:03:42.024	SAVDO_MARKAZ	32232	ACTIVE
1	Aminov1	Post	310887	2025-09-19 20:24:15.774	2026-06-19 14:06:00.943	SKLAD	2323232	ACTIVE
4	Sklad	Sklad	-100001	2026-04-15 14:37:41.811	2026-06-23 14:18:52.589	SKLAD	\N	ACTIVE
\.


--
-- Data for Name: CashierReport; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CashierReport" (id, "cashierId", "branchId", "reportDate", "cashTotal", "cardTotal", "creditTotal", "installmentTotal", "upfrontTotal", "upfrontCash", "upfrontCard", "soldQuantity", "soldAmount", "repaymentTotal", "defectivePlus", "defectiveMinus", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Category" (id, name, description, "branchId", "createdAt", "updatedAt") FROM stdin;
1	Telefon	\N	\N	2025-09-19 21:36:58.946	2025-09-19 21:36:58.946
2	Category		2	2026-06-19 10:33:11.833	2026-06-19 10:33:11.833
\.


--
-- Data for Name: CreditRepayment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CreditRepayment" (id, "transactionId", "scheduleId", amount, channel, month, "paidAt", "paidByUserId", "createdAt", "monthNumber", "branchId") FROM stdin;
2	107	38	200000	CASH	1	2026-02-13 18:48:04.748	15	2026-02-13 18:48:04.751	\N	\N
3	109	44	500000	CASH	1	2026-02-13 19:19:05.058	15	2026-02-13 19:19:05.061	\N	\N
4	111	46	100000	CASH	1	2026-02-13 19:26:14.368	15	2026-02-13 19:26:14.371	\N	\N
5	111	46	400000	CASH	1	2026-03-14 21:08:22.427	2	2026-03-14 21:08:22.43	\N	\N
6	226	47	250000	CASH	1	2026-04-20 15:41:14.903	15	2026-04-20 15:41:14.908	\N	\N
7	232	53	187500	CASH	1	2026-04-21 15:35:48.892	15	2026-04-21 15:35:48.895	\N	\N
8	233	57	250000	CASH	1	2026-04-21 15:38:35.205	15	2026-04-21 15:38:35.209	\N	\N
9	232	54	187500	CASH	2	2026-04-21 15:38:55.819	15	2026-04-21 15:38:55.822	\N	\N
10	232	55	187500	CASH	3	2026-04-21 15:38:59.22	15	2026-04-21 15:38:59.223	\N	\N
11	232	56	187500	CASH	4	2026-04-21 15:39:01.217	15	2026-04-21 15:39:01.22	\N	\N
19	236	62	500000	CASH	1	2026-04-25 19:50:51.711	15	2026-04-25 19:50:51.765	\N	1
20	236	62	500000	CARD	1	2026-04-25 19:51:43.809	15	2026-04-25 19:51:43.839	\N	1
21	236	62	500000	TERMINAL	1	2026-04-25 19:52:19.325	15	2026-04-25 19:52:19.357	\N	1
22	257	82	500000	TERMINAL	1	2026-04-25 20:04:49.305	15	2026-04-25 20:04:49.339	\N	1
23	258	83	1500000	CASH	1	2026-04-27 19:19:02.344	15	2026-04-27 19:19:02.389	\N	1
25	259	84	1500000	TERMINAL	1	2026-04-27 19:20:17.492	15	2026-04-27 19:20:17.521	\N	1
30	260	85	1500000	CARD	1	2026-04-27 19:45:19.897	15	2026-04-27 19:45:19.922	\N	1
31	241	71	412500	CASH	1	2026-04-27 20:18:03.406	15	2026-04-27 20:18:03.446	\N	1
32	241	72	412500	TERMINAL	2	2026-04-27 20:21:44.552	15	2026-04-27 20:21:44.595	\N	1
33	258	83	1500000	TERMINAL	1	2026-04-27 21:39:38.604	15	2026-04-27 21:39:38.655	\N	1
34	235	61	500000	CASH	1	2026-06-19 13:56:03.101	2	2026-06-19 13:56:03.142	\N	2
35	235	61	500000	CASH	1	2026-06-19 13:56:03.153	2	2026-06-19 13:56:03.157	\N	\N
44	255	81	3000000	CASH	1	2026-06-19 14:06:00.924	15	2026-06-19 14:06:00.942	\N	1
\.


--
-- Data for Name: CurrencyExchangeRate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CurrencyExchangeRate" (id, "fromCurrency", "toCurrency", rate, "isActive", "branchId", "createdBy", "createdAt", "updatedAt") FROM stdin;
1	USD	UZS	13000	t	1	\N	2025-09-19 22:07:46.494	2026-06-19 13:43:29.547
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Customer" (id, "fullName", phone, email, address, "passportSeries", jshshir, "createdAt", "updatedAt") FROM stdin;
1	Sis sss	32323	\N	\N	\N	\N	2025-09-19 22:15:27.522	2025-09-19 22:15:27.522
2	cewd wed	dw	\N	\N	\N	\N	2025-09-19 22:19:41.008	2025-09-19 22:19:41.008
3	dowdy Dow	fwd	\N	\N	\N	\N	2025-09-19 22:23:36.186	2025-09-19 22:23:36.186
4	3wef wefwef	wefwe	\N	\N	\N	\N	2025-09-19 22:26:19.183	2025-09-19 22:26:19.183
5	wefqw qwef	qwef	\N	\N	\N	\N	2025-09-19 22:27:27.977	2025-09-19 22:27:27.977
6	11 11	11	\N	\N	\N	\N	2025-09-19 22:36:43.661	2025-09-19 22:36:43.661
7	22 22	22	\N	\N	\N	\N	2025-09-19 22:38:36.067	2025-09-19 22:38:36.067
8	5 5	5	\N	\N	\N	\N	2025-09-19 22:39:21.948	2025-09-19 22:39:21.948
9	66 66	66	\N	\N	\N	\N	2025-09-19 22:45:07.879	2025-09-19 22:45:07.879
10	vv vv	vv	\N	\N	\N	\N	2025-09-19 22:56:26.6	2025-09-19 22:56:26.6
11	vdf dfv	vfd	\N	\N	\N	\N	2025-09-19 23:02:14.685	2025-09-19 23:02:14.685
15	bb bb	+998975553321	\N	bbb	bb2422424	2523452345234523	2025-09-19 23:10:30.117	2025-09-19 23:10:30.117
16	dwe dwe	+998919998822	\N	\N	\N	\N	2025-09-19 23:25:56.811	2025-09-19 23:25:56.811
17	er er	+998911112233	\N	\N	\N	\N	2025-09-19 23:26:51.804	2025-09-19 23:26:51.804
18	we we	+998977775544	\N	\N	\N	\N	2025-09-19 23:31:38.796	2025-09-19 23:31:38.796
19	gg gg	+998954443322	\N	\N	\N	\N	2025-09-19 23:32:35.793	2025-09-19 23:32:35.793
20	ff ff	+998922223311	\N	\N	\N	\N	2025-09-19 23:39:04.835	2025-09-19 23:39:04.835
21	gg gg	+998113332233	\N	\N	\N	\N	2025-09-19 23:44:49.825	2025-09-19 23:44:49.825
22	dd dd	+998912222222	\N	\N	\N	\N	2025-09-20 20:54:03.074	2025-09-20 20:54:03.074
23	e3 e23	32e	\N	\N	\N	\N	2025-09-20 20:54:23.618	2025-09-20 20:54:23.618
24	fwe fwe	fwe	\N	\N	\N	\N	2025-09-20 20:55:55.669	2025-09-20 20:55:55.669
25	dfg dfg	+998918884455	\N	\N	\N	\N	2025-09-20 20:56:59.427	2025-09-20 20:56:59.427
26	awf awef	+998999898899	\N	\N	\N	\N	2025-09-20 21:02:46.523	2025-09-20 21:02:46.523
27	afd asd	+998911112211	\N	\N	\N	\N	2025-09-20 21:10:01.522	2025-09-20 21:10:01.522
28	cc cc	+998900003232	\N	\N	\N	\N	2025-09-20 21:11:40.494	2025-09-20 21:11:40.494
29	3223 2323	+998919993311	\N	\N	\N	\N	2025-09-20 21:12:20.496	2025-09-20 21:12:20.496
30	g g	+998444444444	\N	\N	\N	\N	2025-09-20 21:18:06.516	2025-09-20 21:18:06.516
31	dd dd	+998543334455	\N	\N	\N	\N	2025-09-20 21:24:55.556	2025-09-20 21:24:55.556
32	rr rr	+998933334433	\N	\N	\N	\N	2025-09-20 21:25:49.539	2025-09-20 21:25:49.539
14	g g	g	\N		\N	\N	2025-09-19 23:08:32.543	2025-09-20 21:27:42.247
33	3 3	3	\N	\N	\N	\N	2025-09-20 21:28:41.071	2025-09-20 21:28:41.071
12	2 2	2	\N		\N	\N	2025-09-19 23:03:20.002	2025-09-20 21:44:06.479
34	V V	V	\N	\N	\N	\N	2025-09-20 21:59:17.859	2025-09-20 21:59:17.859
13	f f	f	\N		\N	\N	2025-09-19 23:07:26.36	2025-09-21 11:22:00.67
35	v v	v	\N	\N	\N	\N	2025-09-21 11:29:54.43	2025-09-21 11:29:54.43
36	Номаълум		\N	\N	\N	\N	2025-09-21 11:37:41.324	2025-09-21 11:37:41.324
37	o o	o	\N	\N	\N	\N	2025-09-21 11:41:59.432	2025-09-21 11:41:59.432
38	b b	b	\N	\N	\N	\N	2025-09-21 15:58:26.481	2025-09-21 15:58:26.481
39	w w	w	\N	\N	\N	\N	2025-09-22 06:30:11.425	2025-09-22 06:30:11.425
40	d d	d	\N	\N	\N	\N	2025-09-22 18:27:48.916	2025-09-22 18:27:48.916
41	vvv vvv	23232323323	\N	\N	\N	\N	2025-09-23 18:29:44.989	2025-09-23 18:29:44.989
42	www ww	ww	\N	\N	\N	\N	2025-09-23 18:35:26.299	2025-09-23 18:35:26.299
43	qq qq	q	\N	\N	\N	\N	2025-09-23 18:41:11.189	2025-09-23 18:41:11.189
44	ewe weq	+998919998833	\N	rrrrr	dd23232322323	2322322332322323	2025-09-23 21:46:25.108	2025-09-23 21:46:25.108
45	jhvhb jnkj	+998956765678	\N	\N	\N	\N	2025-09-24 06:40:40.778	2025-09-24 06:40:40.778
47	test test	+998434343434	\N	\N	\N	\N	2025-10-31 09:08:45.282	2025-10-31 09:08:45.282
48	test test	+998999999999	\N	\N	\N	\N	2025-10-31 09:17:03.142	2025-10-31 09:17:03.142
49	test test	+998323232323	\N	\N	\N	\N	2025-10-31 11:10:40.761	2025-10-31 11:10:40.761
50	test test	+998000000000	\N	\N	\N	\N	2025-10-31 11:13:26.716	2025-10-31 11:13:26.716
51	test test	+998222323232	\N	\N	\N	\N	2025-10-31 11:23:52.93	2025-10-31 11:23:52.93
52	test test	+998453454545	\N	\N	\N	\N	2025-10-31 11:27:39.244	2025-10-31 11:27:39.244
53	2 2	+998098098098	\N	lkjhlkjh	\N	\N	2025-11-12 18:34:45.097	2025-11-12 18:34:45.097
82	wer wer	+998234432343	\N	\N	\N	\N	2026-04-06 18:41:00.713	2026-04-06 18:41:00.713
54	er er	+998343434343	\N	343434	\N	\N	2025-11-12 20:16:35.314	2025-11-12 20:30:15.982
56	2121 1212	+998121231231	\N	\N	AA323223323	4123412342134123	2025-11-14 17:43:48.483	2025-11-14 17:43:48.483
57	tr tr	+998452452345	\N	\N	AA32323232323	5123521351235123	2025-11-14 17:52:53.403	2025-11-14 17:52:53.403
46	22 22	+998222222222	\N		AA22222222	2222222222222222	2025-10-25 18:44:24.005	2025-11-17 19:47:02.112
58	e e	+998433434343	\N	\N	\N	\N	2025-11-17 20:21:49.206	2025-11-17 20:21:49.206
59	333 3333	+998333423432	\N	\N	\N	\N	2025-11-17 20:24:13.486	2025-11-17 20:24:13.486
60	ww ww	+998467456745	\N	\N	\N	\N	2025-11-17 20:34:53.113	2025-11-17 20:34:53.113
61	123 123	+998123212211	\N	\N	\N	\N	2025-11-23 14:00:42.399	2025-11-23 14:00:42.399
62	dfg dfg	+998342542324	\N	\N	\N	\N	2025-11-23 14:05:05.457	2025-11-23 14:05:05.457
63	vvfsd dsadscdsac	+998564334564	\N	\N	\N	\N	2025-11-23 14:28:15.832	2025-11-23 14:28:15.832
64	987 987	+998998798798	\N	\N	\N	\N	2025-11-23 14:29:56.598	2025-11-23 14:29:56.598
65	dgs sdg	+998123123312	\N	\N	\N	\N	2025-11-23 15:08:33.699	2025-11-23 15:08:33.699
66	qwer qwer	+998234423243	\N	\N	\N	\N	2025-11-28 09:40:11.096	2025-11-28 09:40:11.096
67	1212 12121	+998199821212	\N	\N	\N	\N	2025-11-28 10:42:56.094	2025-11-28 10:42:56.094
68	1 1	+998121212122	\N	\N	\N	\N	2025-11-28 10:49:08.557	2025-11-28 10:49:08.557
69	123 123123	+998123123123	\N		\N	\N	2025-11-28 10:49:48.585	2025-11-28 10:50:06.444
70	11 11111	+998111212121	\N	\N	\N	1qwewq	2025-11-28 18:05:01.285	2025-11-28 18:05:01.285
72	121 121	+998879678868	\N	\N	\N	\N	2025-11-28 18:06:18.713	2025-11-28 18:06:18.713
55	1 1	+998111111111	\N		AA2324424	6543456345634565	2025-11-12 20:35:55.572	2026-01-30 17:58:51.876
83	iuytr ljuhygf	+998154815415	\N	\N	\N	\N	2026-04-20 14:17:38.726	2026-04-20 14:17:38.726
73	1 1	+998432112341	\N	\N	\N	\N	2026-02-13 18:31:25.112	2026-02-13 18:31:25.112
74	1 1	+998777788787	\N	\N	\N	\N	2026-02-13 18:35:48.061	2026-02-13 18:35:48.061
71	112 112	+998121212121	\N		\N	12	2025-11-28 18:05:35.912	2026-02-13 18:39:17.018
75	adsa adsa	+998234334343	\N	\N	\N	\N	2026-02-13 18:42:37.052	2026-02-13 18:42:37.052
76	zxcv zxzcv	+998523443252	\N	\N	\N	\N	2026-02-13 18:53:12.056	2026-02-13 18:53:12.056
77	qwer qwer	+998324112341	\N	\N	\N	\N	2026-02-13 19:20:01.256	2026-02-13 19:20:01.256
78	12121212 12211212	+998122112122	\N	\N	\N	\N	2026-02-13 19:25:33.9	2026-02-13 19:25:33.9
79	123 123	+998299822321	\N	\N	\N	\N	2026-03-14 20:52:16.256	2026-03-14 20:52:16.256
80	qwer qwer	+998299834233	\N	\N	\N	\N	2026-04-06 18:10:47.62	2026-04-06 18:10:47.62
81	123 123	+998123212321	\N	\N	\N	\N	2026-04-06 18:13:59.978	2026-04-06 18:13:59.978
84	lkjhgf lkjhgf	+998937078047	\N	\N	\N	\N	2026-04-20 14:30:56.093	2026-04-20 14:30:56.093
85	2qwedr 2q3werft	+998232424434	\N	\N	\N	\N	2026-04-20 14:34:30.918	2026-04-20 14:34:30.918
86	ali all	+998965896584	\N	\N	\N	\N	2026-04-20 14:34:34.828	2026-04-20 14:34:34.828
87	234r 234r	+998234323434	\N	\N	\N	\N	2026-04-20 15:27:16.976	2026-04-20 15:27:16.976
88	123 123	+998987898908	\N	\N	\N	\N	2026-04-20 15:49:08.118	2026-04-20 15:49:08.118
89	trew trew	+998645345654	\N	\N	\N	\N	2026-04-20 15:56:02.1	2026-04-20 15:56:02.1
90	bek bek	+998324234234	\N	\N	\N	\N	2026-04-20 16:00:25.142	2026-04-20 16:00:25.142
91	1 1	+998109876578	\N	\N	\N	\N	2026-04-21 14:03:55.185	2026-04-21 14:03:55.185
92	qweewq qweewq	+998678876678	\N	\N	\N	\N	2026-04-21 15:33:05.686	2026-04-21 15:33:05.686
93	xcv xcv	+998768453876	\N	\N	\N	\N	2026-04-21 15:35:29.396	2026-04-21 15:35:29.396
94	qwe qwer	+998121212112	\N	wqdqwdqddqw	\N	\N	2026-04-21 15:48:03.736	2026-04-21 15:48:03.736
95	qwe qwe	+998345345345	\N	\N	\N	\N	2026-04-21 15:52:43.848	2026-04-21 15:52:43.848
96	1q1q1q1 q1q1q1q1	+998090909090	\N	1q1q	\N	\N	2026-04-21 15:58:18.602	2026-04-21 15:58:18.602
97	alibek Alibek	+998977778047	\N	\N	\N	\N	2026-04-21 16:28:52.127	2026-04-21 16:28:52.127
98	Jamshid Gulimov	+998957653215	\N	ert	\N	\N	2026-04-21 16:32:02.665	2026-04-21 16:32:02.665
99	fwe fwe	+998234234234	\N	\N	\N	\N	2026-04-22 15:07:49.813	2026-04-22 15:07:49.813
100	21 12	+998122121211	\N	\N	\N	\N	2026-04-22 15:09:03.118	2026-04-22 15:09:03.118
101	fwer gwe	+998233242352	\N	\N	fw322332	4232342342342342	2026-04-22 15:10:44.792	2026-04-22 15:10:44.792
102	Ali Ali	+998222228047	\N	ewr	\N	\N	2026-04-23 16:01:53.422	2026-04-23 16:01:53.422
103	few fwe	+998977788878	\N	\N	\N	\N	2026-04-23 16:03:53.485	2026-04-23 16:03:53.485
104	fwe few	+998909099090	\N	\N	\N	\N	2026-04-23 20:31:36.543	2026-04-23 20:31:36.543
106	nn nn	+998787788778	\N	\N	\N	\N	2026-04-23 20:36:06.134	2026-04-23 20:36:06.134
107	1 1	+998212121212	\N	\N	\N	\N	2026-04-23 20:45:16.019	2026-04-23 20:45:16.019
108	mnb mnb	+998222324343	\N	\N	\N	\N	2026-04-23 21:31:24.967	2026-04-23 21:31:24.967
105	ww ww	+998233223233	\N		\N	\N	2026-04-23 20:32:33.525	2026-04-23 22:13:56.076
110	test test	+998333333222	\N	\N	\N	\N	2026-04-23 22:14:53.296	2026-04-23 22:14:53.296
111	qwer qwer1	+998678786547	\N	\N	\N	\N	2026-04-24 18:11:57.736	2026-04-24 18:11:57.736
112	Alibek Alibek	+998778976768	\N	\N	\N	\N	2026-04-24 18:13:48.6	2026-04-24 18:13:48.6
113	fasd fasd	+998657456746	\N	\N	\N	\N	2026-04-25 19:59:20.093	2026-04-25 19:59:20.093
114	ismadbek ismadbek	+998675474745	\N	\N	\N	\N	2026-04-25 20:03:28.018	2026-04-25 20:03:28.018
115	mnbmnmbmnbm mnbmnmbmnbm	+998766787677	\N	\N	\N	\N	2026-04-27 19:17:47.541	2026-04-27 19:17:47.541
116	kjnbfvkjsfben bkjsenrjknns	+998786977869	\N	\N	\N	\N	2026-04-27 19:20:03.303	2026-04-27 19:20:03.303
109	3 3	+998333333333	\N		\N	\N	2026-04-23 21:37:10.855	2026-04-27 19:41:48.708
117	dfwef fwefwe	+998324432324	\N	wefew	\N	\N	2026-05-13 17:59:38.369	2026-05-13 17:59:38.369
118	qwer qewr	+998123454231	\N	\N	\N	\N	2026-06-18 14:14:36.778	2026-06-18 14:14:36.778
119	qwer qwerf	+998123432343	\N	Dostlik	\N	\N	2026-06-23 12:39:25.269	2026-06-23 12:39:25.269
\.


--
-- Data for Name: DailyExpense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DailyExpense" (id, amount, reason, description, "createdAt") FROM stdin;
1	10000	100000	1000000	2025-11-14 16:49:25.259
2	200000	Benzin	palankasa tulankas bardi	2025-11-14 17:21:26.947
3	100000	Alibek	Alibek	2026-05-03 17:15:44.732
\.


--
-- Data for Name: DailyRepayment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DailyRepayment" (id, "transactionId", amount, channel, "paidAt", "paidByUserId", "createdAt", "branchId") FROM stdin;
\.


--
-- Data for Name: DriverRating; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DriverRating" (id, "driverId", "transactionId", rating, "ratedBy", "ratedAt", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FaceTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FaceTemplate" (id, "userId", "deviceId", template, vector, "imageUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: GlobalRate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GlobalRate" (id, value, "createdAt", "updatedAt") FROM stdin;
1	50	2025-11-12 19:40:51.974	2025-11-12 19:40:51.974
\.


--
-- Data for Name: PaymentRepayment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaymentRepayment" (id, "transactionId", "scheduleId", amount, channel, "paidAt", "paidByUserId", "createdAt") FROM stdin;
2	107	38	200000	CASH	2026-02-13 18:48:04.689	15	2026-02-13 18:48:04.725
3	109	44	500000	CASH	2026-02-13 19:19:04.925	15	2026-02-13 19:19:04.993
4	111	46	100000	CASH	2026-02-13 19:26:14.304	15	2026-02-13 19:26:14.335
5	111	46	400000	CASH	2026-03-14 21:08:22.377	2	2026-03-14 21:08:22.417
6	226	47	250000	CASH	2026-04-20 15:41:14.837	15	2026-04-20 15:41:14.874
7	232	53	187500	CASH	2026-04-21 15:35:48.836	15	2026-04-21 15:35:48.868
8	233	57	250000	CASH	2026-04-21 15:38:35.116	15	2026-04-21 15:38:35.15
9	232	54	187500	CASH	2026-04-21 15:38:55.782	15	2026-04-21 15:38:55.803
10	232	55	187500	CASH	2026-04-21 15:38:59.182	15	2026-04-21 15:38:59.202
11	232	56	187500	CASH	2026-04-21 15:39:01.182	15	2026-04-21 15:39:01.201
12	242	75	500000	CASH	2026-04-23 16:09:28.25	2	2026-04-23 16:09:28.279
19	254	80	1000000	TERMINAL	2026-04-24 18:12:18.891	15	2026-04-24 18:12:18.922
20	255	81	3000000	CASH	2026-04-24 18:14:21.891	15	2026-04-24 18:14:21.922
23	236	62	500000	CASH	2026-04-25 19:50:51.711	15	2026-04-25 19:50:51.756
24	236	62	500000	CARD	2026-04-25 19:51:43.809	15	2026-04-25 19:51:43.835
25	236	62	500000	TERMINAL	2026-04-25 19:52:19.325	15	2026-04-25 19:52:19.355
26	257	82	500000	TERMINAL	2026-04-25 20:04:49.305	15	2026-04-25 20:04:49.336
32	260	85	1500000	CARD	2026-04-27 19:45:19.897	15	2026-04-27 19:45:19.92
33	241	71	412500	CASH	2026-04-27 20:18:03.406	15	2026-04-27 20:18:03.443
34	241	72	412500	TERMINAL	2026-04-27 20:21:44.552	15	2026-04-27 20:21:44.592
35	258	83	1500000	TERMINAL	2026-04-27 21:39:38.604	15	2026-04-27 21:39:38.647
36	235	61	500000	CASH	2026-06-19 13:56:03.101	2	2026-06-19 13:56:03.133
43	255	81	3000000	CASH	2026-06-19 14:06:00.924	15	2026-06-19 14:06:00.941
\.


--
-- Data for Name: PaymentSchedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaymentSchedule" (id, "transactionId", month, payment, "remainingBalance", "isPaid", "paidAmount", "paidAt", "createdAt", "creditRepaymentAmount", "repaymentDate", "paidByUserId", "paidChannel", rating, "daysCount", "dueDate", "isDailyInstallment", "installmentType", "remainingDays", "remainingMonths", "totalDays", "totalMonths") FROM stdin;
53	232	1	187500	562500	t	187500	2026-04-21 15:35:48.836	2026-04-21 15:35:29.413	187500	2026-04-21 15:35:48.836	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	4	\N	4
39	107	2	200000	800000	f	0	\N	2026-02-13 18:39:17.036	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	5	\N	6
40	107	3	200000	600000	f	0	\N	2026-02-13 18:39:17.036	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	4	\N	6
41	107	4	200000	400000	f	0	\N	2026-02-13 18:39:17.036	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	3	\N	6
42	107	5	200000	200000	f	0	\N	2026-02-13 18:39:17.036	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	2	\N	6
43	107	6	200000	0	f	0	\N	2026-02-13 18:39:17.036	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	6
38	107	1	200000	1000000	t	200000	2026-02-13 18:48:04.689	2026-02-13 18:39:17.036	200000	2026-02-13 18:48:04.689	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	6	\N	6
44	109	1	1000000	1000000	f	500000	2026-02-13 19:19:04.925	2026-02-13 18:53:12.083	500000	2026-02-13 19:19:04.925	15	CASH	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
45	110	1	500000	500000	f	0	\N	2026-02-13 19:20:01.278	0	\N	\N	\N	\N	\N	\N	f	UYDAN	\N	\N	\N	\N
46	111	1	500000	500000	t	500000	2026-03-14 21:08:22.377	2026-02-13 19:25:33.918	400000	2026-03-14 21:08:22.377	2	CASH	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
47	226	1	750000	0	f	250000	2026-04-20 15:41:14.837	2026-04-20 15:27:17.018	250000	2026-04-20 15:41:14.837	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	1	\N	1
48	227	1	750000	0	f	0	\N	2026-04-20 15:49:08.132	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	1
49	228	1	750000	0	f	0	\N	2026-04-20 15:56:02.119	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	1
50	229	1	750000	0	f	0	\N	2026-04-20 16:00:25.168	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	1
51	230	1	750000	0	f	0	\N	2026-04-21 14:03:55.212	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	1
52	231	1	750000	0	f	0	\N	2026-04-21 15:33:05.703	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	1
58	233	2	250000	250000	f	0	\N	2026-04-21 15:36:24.928	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	2	\N	3
59	233	3	250000	0	f	0	\N	2026-04-21 15:36:24.929	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	3
57	233	1	250000	500000	t	250000	2026-04-21 15:38:35.116	2026-04-21 15:36:24.925	250000	2026-04-21 15:38:35.116	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	3	\N	3
54	232	2	187500	375000	t	187500	2026-04-21 15:38:55.782	2026-04-21 15:35:29.416	187500	2026-04-21 15:38:55.782	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	3	\N	4
55	232	3	187500	187500	t	187500	2026-04-21 15:38:59.182	2026-04-21 15:35:29.418	187500	2026-04-21 15:38:59.182	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	2	\N	4
56	232	4	187500	0	t	187500	2026-04-21 15:39:01.182	2026-04-21 15:35:29.421	187500	2026-04-21 15:39:01.182	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	1	\N	4
60	234	1	1000000	1000000	f	0	\N	2026-04-21 15:48:03.757	0	\N	\N	\N	\N	\N	\N	f	UYDAN	\N	\N	\N	\N
64	237	2	250000	500000	f	0	\N	2026-04-21 16:28:52.153	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	3	\N	4
65	237	3	250000	250000	f	0	\N	2026-04-21 16:28:52.155	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	2	\N	4
66	237	4	250000	0	f	0	\N	2026-04-21 16:28:52.157	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	4
67	238	1	1000000	1000000	f	0	\N	2026-04-21 16:32:02.678	0	\N	\N	\N	\N	\N	\N	f	UYDAN	\N	\N	\N	\N
70	240	2	125000	0	f	0	\N	2026-04-22 15:09:03.14	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	2
73	241	3	412500	412500	f	0	\N	2026-04-22 15:10:44.807	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	2	\N	4
74	241	4	412500	0	f	0	\N	2026-04-22 15:10:44.807	0	\N	\N	\N	\N	\N	\N	f	MONTHLY	\N	1	\N	4
75	242	1	500000	500000	t	500000	2026-04-23 16:09:28.25	2026-04-23 16:01:53.447	500000	2026-04-23 16:09:28.25	2	CASH	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
72	241	2	412500	825000	t	412500	2026-04-27 20:21:44.552	2026-04-22 15:10:44.807	412500	2026-04-27 20:21:44.552	15	TERMINAL	YAXSHI	\N	\N	f	MONTHLY	\N	3	\N	4
80	254	1	1000000	1000000	t	1000000	2026-04-24 18:12:18.891	2026-04-24 18:11:57.76	1000000	2026-04-24 18:12:18.891	15	TERMINAL	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
62	236	1	1500000	1500000	t	1500000	2026-04-25 19:52:19.325	2026-04-21 15:58:18.615	500000	2026-04-25 19:52:19.325	15	TERMINAL	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
82	257	1	1000000	1000000	f	500000	2026-04-25 20:04:49.305	2026-04-25 20:03:28.039	500000	2026-04-25 20:04:49.305	15	TERMINAL	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
83	258	1	1500000	1500000	t	1500000	2026-04-27 21:39:38.604	2026-04-27 19:17:47.57	1500000	2026-04-27 21:39:38.604	15	TERMINAL	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
69	240	1	125000	125000	f	0	2026-04-24 18:41:27.483	2026-04-22 15:09:03.138	125000	2026-04-24 18:41:27.483	\N	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	2	\N	2
61	235	1	1500000	1500000	f	500000	2026-06-19 13:56:03.101	2026-04-21 15:52:43.867	500000	2026-06-19 13:56:03.101	2	CASH	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
68	240	1	250000	250000	f	0	2026-04-24 18:41:44.882	2026-04-22 15:09:03.134	250000	2026-04-24 18:41:44.882	\N	CASH	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
63	237	1	250000	750000	f	0	\N	2026-04-21 16:28:52.149	250000	\N	\N	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	4	\N	4
81	255	1	3000000	3000000	t	3000000	2026-06-19 14:06:00.924	2026-04-24 18:13:48.618	3000000	2026-06-19 14:06:00.924	15	CASH	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
85	260	1	1500000	1500000	t	1500000	2026-04-27 19:45:19.897	2026-04-27 19:41:48.741	1500000	2026-04-27 19:45:19.897	15	CARD	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
86	324	1	1300000	1300000	f	0	\N	2026-06-23 12:39:25.303	0	\N	\N	\N	\N	\N	\N	f	UYDAN	\N	\N	\N	\N
84	259	1	1500000	1500000	f	0	\N	2026-04-27 19:20:03.32	1500000	\N	\N	CASH	YAXSHI	\N	\N	f	UYDAN	\N	\N	\N	\N
71	241	1	412500	1237500	t	412500	2026-04-27 20:18:03.406	2026-04-22 15:10:44.807	412500	2026-04-27 20:18:03.406	15	CASH	YAXSHI	\N	\N	f	MONTHLY	\N	4	\N	4
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Product" (id, name, barcode, model, price, quantity, "defectiveQuantity", "returnedQuantity", "exchangedQuantity", "initialQuantity", status, "branchId", "categoryId", "marketPrice", "deletedAt", "isDeleted", "bonusPercentage", "createdAt", "updatedAt", months) FROM stdin;
161	TEST10	27	TEST10	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
162	TEST11	29	TEST11	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
163	TEST12	31	TEST12	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
164	TEST13	33	TEST13	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
165	TEST14	35	TEST14	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
166	TEST15	37	TEST15	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
24	TEST8	23	TEST8	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.551	2026-04-15 14:47:48.551	\N
25	TEST9	25	TEST9	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.555	2026-04-15 14:47:48.555	\N
167	TEST16	39	TEST16	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
168	TEST17	41	TEST17	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
169	TEST18	43	TEST18	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
170	TEST19	45	TEST19	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
171	TEST2	11	TEST2	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
172	TEST20	47	TEST20	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
173	TEST21	49	TEST21	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
174	TEST22	51	TEST22	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-04-15 14:52:27.538	\N
243	New	167	New	100	1	0	0	0	0	IN_WAREHOUSE	3	1	1200	\N	f	10	2026-06-19 11:42:35.445	2026-06-19 11:42:35.445	\N
237	television 	168	art	10	99	0	0	0	100	IN_STORE	4	1	10	\N	f	100	2026-05-26 21:13:09.125	2026-06-19 11:42:35.447	12
229	few	166	fer	100	97	0	0	0	100	IN_STORE	4	1	130	\N	f	10	2026-05-22 09:30:06.651	2026-06-23 11:27:56.58	few
160	TEST1	9	TEST1	100	4	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.538	2026-05-22 09:32:47.972	\N
238	television 	169	kat	1	100	0	0	0	100	IN_WAREHOUSE	2	1	2	\N	f	10	2026-05-26 21:13:39.725	2026-05-26 21:13:39.725	12
96	TEST1	9	TEST1	100	0	0	0	0	0	SOLD	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-21 15:58:18.619	\N
242	few	166	fer	100	1	0	0	0	0	IN_WAREHOUSE	3	1	130	\N	f	10	2026-06-19 11:42:35.435	2026-06-19 11:42:35.435	\N
244	television 	168	art	10	1	0	0	0	0	IN_WAREHOUSE	3	1	10	\N	f	100	2026-06-19 11:42:35.451	2026-06-19 11:42:35.451	\N
375		431	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.608	2026-06-20 14:53:18.608	\N
376		433	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.611	2026-06-20 14:53:18.611	\N
377		435	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.613	2026-06-20 14:53:18.613	\N
175	TEST23	53	TEST23	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
176	TEST24	55	TEST24	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
177	TEST25	57	TEST25	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
178	TEST26	59	TEST26	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
179	TEST27	61	TEST27	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
180	TEST28	63	TEST28	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
181	TEST29	65	TEST29	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
182	TEST3	13	TEST3	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
183	TEST30	67	TEST30	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
378		437	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.615	2026-06-20 14:53:18.615	\N
379		439	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.617	2026-06-20 14:53:18.617	\N
380		441	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.619	2026-06-20 14:53:18.619	\N
381		443	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.621	2026-06-20 14:53:18.621	\N
382		445	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.624	2026-06-20 14:53:18.624	\N
4	asdf	1	Salom	10	0	0	0	0	0	IN_WAREHOUSE	3	1	20	2026-04-15 14:39:51.343	t	6	2025-10-25 22:07:03.232	2026-04-15 14:39:51.344	\N
8	asdf	1	Salom	10	0	0	0	0	0	IN_WAREHOUSE	2	1	20	2026-04-15 14:39:51.343	t	6	2025-11-30 18:45:04.95	2026-04-15 14:39:51.343	\N
6	e3e23e	4	rrr	233	0	0	2	0	0	IN_STORE	1	1	344	2026-01-30 18:00:32.135	t	34	2025-10-25 22:11:54.265	2026-01-30 18:00:32.136	\N
9	e3e23e	4	rrr	233	0	0	0	0	0	IN_WAREHOUSE	3	1	344	2026-04-15 14:39:51.349	t	34	2025-11-30 18:46:27.404	2026-04-15 14:39:51.35	\N
5	e3e23e	4	rrr	233	0	0	0	0	344	IN_STORE	2	1	344	2026-04-15 14:39:51.354	t	34	2025-10-25 22:11:26.924	2026-04-15 14:39:51.355	\N
3	kjbnvkajbv	3	dqwdq	120	0	0	0	0	1220	IN_WAREHOUSE	3	1	150	2026-04-15 14:39:51.354	t	1	2025-09-23 20:32:37.719	2026-04-15 14:39:51.355	\N
15	Redmi	7	Model	123	0	0	0	0	124	IN_STORE	3	1	124	2026-04-15 14:39:51.355	t	10	2026-04-15 10:04:26.268	2026-04-15 14:39:51.356	1
16	Redmi	7	Model	123	0	0	0	0	0	IN_WAREHOUSE	2	1	124	2026-04-15 14:39:51.358	t	10	2026-04-15 10:08:45.908	2026-04-15 14:39:51.359	\N
2	v	2	fffffff	50	0	0	2	0	505	SOLD	1	1	100	2026-04-15 14:39:51.358	t	10	2025-09-24 00:50:25.948	2026-04-15 14:39:51.359	\N
12	Bek	6	Bek	13	0	0	0	0	100	IN_STORE	1	1	15	2026-04-15 14:39:51.359	t	11	2026-03-19 19:30:08.131	2026-04-15 14:39:51.359	\N
13	Bek	6	Bek	13	0	0	0	0	0	IN_WAREHOUSE	2	1	15	2026-04-15 14:39:51.359	t	11	2026-03-19 19:31:00.156	2026-04-15 14:39:51.36	\N
14	Bek	6	Bek	13	0	0	0	0	0	IN_WAREHOUSE	3	1	15	2026-04-15 14:39:51.359	t	11	2026-04-09 14:40:24.18	2026-04-15 14:39:51.36	\N
10	v	2	fffffff	50	0	0	0	0	0	IN_WAREHOUSE	3	1	100	2026-04-15 14:39:51.36	t	10	2026-03-14 20:36:59.049	2026-04-15 14:39:51.361	\N
11	v	2	fffffff	1000000	0	0	0	0	0	IN_WAREHOUSE	2	1	100	2026-04-15 14:39:51.362	t	10	2026-03-14 20:48:50.32	2026-04-15 14:39:51.363	\N
7	yang 	5	fwfwef	10	0	0	0	0	100	IN_STORE	2	1	12	2026-04-15 14:39:51.362	t	10	2025-11-14 16:29:13.168	2026-04-15 14:39:51.363	0012
230	few	166	fer	100	2	0	0	0	0	IN_WAREHOUSE	2	1	130	\N	f	10	2026-05-22 09:32:47.961	2026-06-23 11:27:56.584	\N
228	TEST1	9	TEST1	100	2	0	0	0	0	IN_WAREHOUSE	3	1	150	\N	f	5	2026-04-24 17:51:47.015	2026-04-24 18:01:26.031	\N
17	TEST1	9	TEST1	100	987	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.513	2026-05-22 09:32:47.968	\N
239	Test Search iPhone	JOINT_1779830264761	15 Pro	999	10	0	0	0	0	IN_STORE	1	1	\N	\N	f	0	2026-05-26 21:17:44.762	2026-05-26 21:17:44.762	\N
245		171	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.303	2026-06-20 14:53:18.303	\N
246		173	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.312	2026-06-20 14:53:18.312	\N
184	TEST31	69	TEST31	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
185	TEST32	71	TEST32	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
186	TEST33	73	TEST33	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
187	TEST34	75	TEST34	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
188	TEST35	77	TEST35	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
189	TEST36	79	TEST36	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.584	2026-04-15 14:52:27.584	\N
247		175	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.315	2026-06-20 14:53:18.315	\N
248		177	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.318	2026-06-20 14:53:18.318	\N
249		179	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.321	2026-06-20 14:53:18.321	\N
250		181	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.323	2026-06-20 14:53:18.323	\N
251		183	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.326	2026-06-20 14:53:18.326	\N
252		185	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.328	2026-06-20 14:53:18.328	\N
86	TEST70	147	TEST70	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.785	2026-04-15 14:47:48.785	\N
87	TEST71	149	TEST71	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.789	2026-04-15 14:47:48.789	\N
88	TEST72	151	TEST72	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.792	2026-04-15 14:47:48.792	\N
89	TEST73	153	TEST73	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.796	2026-04-15 14:47:48.796	\N
90	TEST74	155	TEST74	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.799	2026-04-15 14:47:48.799	\N
91	TEST75	157	TEST75	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.802	2026-04-15 14:47:48.802	\N
92	TEST76	159	TEST76	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.806	2026-04-15 14:47:48.806	\N
93	TEST77	161	TEST77	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.809	2026-04-15 14:47:48.809	\N
94	TEST78	163	TEST78	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.813	2026-04-15 14:47:48.813	\N
95	TEST79	165	TEST79	100	1000	0	0	0	1000	IN_WAREHOUSE	4	1	150	\N	f	5	2026-04-15 14:47:48.817	2026-04-15 14:47:48.817	\N
253		187	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.331	2026-06-20 14:53:18.331	\N
254		189	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.334	2026-06-20 14:53:18.334	\N
255		191	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.336	2026-06-20 14:53:18.336	\N
256		193	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.339	2026-06-20 14:53:18.339	\N
257		195	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.341	2026-06-20 14:53:18.341	\N
258		197	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.343	2026-06-20 14:53:18.343	\N
26	TEST10	27	TEST10	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.559	2026-04-15 14:57:29.804	\N
27	TEST11	29	TEST11	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.563	2026-04-15 14:57:29.804	\N
28	TEST12	31	TEST12	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.566	2026-04-15 14:57:29.804	\N
29	TEST13	33	TEST13	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.57	2026-04-15 14:57:29.804	\N
30	TEST14	35	TEST14	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.574	2026-04-15 14:57:29.804	\N
31	TEST15	37	TEST15	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.577	2026-04-15 14:57:29.804	\N
32	TEST16	39	TEST16	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.581	2026-04-15 14:57:29.804	\N
33	TEST17	41	TEST17	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.585	2026-04-15 14:57:29.804	\N
34	TEST18	43	TEST18	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.588	2026-04-15 14:57:29.804	\N
35	TEST19	45	TEST19	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.592	2026-04-15 14:57:29.804	\N
18	TEST2	11	TEST2	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.527	2026-04-15 14:57:29.804	\N
36	TEST20	47	TEST20	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.595	2026-04-15 14:57:29.804	\N
37	TEST21	49	TEST21	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.599	2026-04-15 14:57:29.804	\N
38	TEST22	51	TEST22	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.603	2026-04-15 14:57:29.804	\N
259		199	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.346	2026-06-20 14:53:18.346	\N
98	TEST11	29	TEST11	100	6	0	2	0	0	RETURNED	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-06-23 14:18:52.574	\N
231	New	167	New	100	1009	0	0	0	1000	IN_STORE	4	1	1200	\N	f	10	2026-05-26 21:03:27.104	2026-06-19 11:42:35.441	12
260		201	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.348	2026-06-20 14:53:18.348	\N
261		203	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.35	2026-06-20 14:53:18.35	\N
262		205	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.353	2026-06-20 14:53:18.353	\N
263		207	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.356	2026-06-20 14:53:18.356	\N
264		209	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.358	2026-06-20 14:53:18.358	\N
265		211	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.361	2026-06-20 14:53:18.361	\N
266		213	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.363	2026-06-20 14:53:18.363	\N
267		215	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.366	2026-06-20 14:53:18.366	\N
268		217	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.369	2026-06-20 14:53:18.369	\N
269		219	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.37	2026-06-20 14:53:18.37	\N
270		221	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.373	2026-06-20 14:53:18.373	\N
271		223	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.375	2026-06-20 14:53:18.375	\N
272		225	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.377	2026-06-20 14:53:18.377	\N
273		227	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.38	2026-06-20 14:53:18.38	\N
274		229	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.382	2026-06-20 14:53:18.382	\N
275		231	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.384	2026-06-20 14:53:18.384	\N
276		233	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.386	2026-06-20 14:53:18.386	\N
102	TEST15	37	TEST15	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
103	TEST16	39	TEST16	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
104	TEST17	41	TEST17	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
105	TEST18	43	TEST18	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
106	TEST19	45	TEST19	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
107	TEST2	11	TEST2	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
108	TEST20	47	TEST20	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
109	TEST21	49	TEST21	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
110	TEST22	51	TEST22	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
111	TEST23	53	TEST23	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
112	TEST24	55	TEST24	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
113	TEST25	57	TEST25	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
114	TEST26	59	TEST26	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
115	TEST27	61	TEST27	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
116	TEST28	63	TEST28	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
117	TEST29	65	TEST29	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
118	TEST3	13	TEST3	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
119	TEST30	67	TEST30	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
120	TEST31	69	TEST31	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
122	TEST32	71	TEST32	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
121	TEST33	73	TEST33	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
123	TEST34	75	TEST34	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
124	TEST35	77	TEST35	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
125	TEST36	79	TEST36	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.672	2026-04-15 14:57:29.847	\N
126	TEST37	81	TEST37	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
127	TEST38	83	TEST38	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
128	TEST39	85	TEST39	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
129	TEST4	15	TEST4	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
277		235	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.389	2026-06-20 14:53:18.389	\N
97	TEST10	27	TEST10	100	0	0	0	0	0	SOLD	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-25 20:03:28.045	\N
232	New	167	New	100	1	0	0	0	0	IN_WAREHOUSE	2	1	1200	\N	f	10	2026-05-26 21:04:04.082	2026-05-26 21:10:48.651	\N
278		237	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.391	2026-06-20 14:53:18.391	\N
279		239	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.393	2026-06-20 14:53:18.393	\N
280		241	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.396	2026-06-20 14:53:18.396	\N
281		243	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.398	2026-06-20 14:53:18.398	\N
282		245	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.4	2026-06-20 14:53:18.4	\N
283		247	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.403	2026-06-20 14:53:18.403	\N
284		249	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.405	2026-06-20 14:53:18.405	\N
285		251	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.407	2026-06-20 14:53:18.407	\N
286		253	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.41	2026-06-20 14:53:18.41	\N
287		255	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.412	2026-06-20 14:53:18.412	\N
288		257	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.414	2026-06-20 14:53:18.414	\N
289		259	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.416	2026-06-20 14:53:18.416	\N
290		261	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.419	2026-06-20 14:53:18.419	\N
291		263	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.42	2026-06-20 14:53:18.42	\N
292		265	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.423	2026-06-20 14:53:18.423	\N
293		267	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.425	2026-06-20 14:53:18.425	\N
294		269	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.427	2026-06-20 14:53:18.427	\N
295		271	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.429	2026-06-20 14:53:18.429	\N
296		273	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.431	2026-06-20 14:53:18.431	\N
297		275	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.433	2026-06-20 14:53:18.433	\N
298		277	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.435	2026-06-20 14:53:18.435	\N
299		279	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.438	2026-06-20 14:53:18.438	\N
300		281	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.44	2026-06-20 14:53:18.44	\N
301		283	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.442	2026-06-20 14:53:18.442	\N
302		285	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.444	2026-06-20 14:53:18.444	\N
303		287	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.446	2026-06-20 14:53:18.446	\N
304		289	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.448	2026-06-20 14:53:18.448	\N
305		291	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.451	2026-06-20 14:53:18.451	\N
306		293	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.453	2026-06-20 14:53:18.453	\N
57	TEST41	89	TEST41	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.68	2026-04-15 14:57:29.855	\N
58	TEST42	91	TEST42	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.683	2026-04-15 14:57:29.855	\N
59	TEST43	93	TEST43	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.687	2026-04-15 14:57:29.855	\N
60	TEST44	95	TEST44	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.69	2026-04-15 14:57:29.855	\N
61	TEST45	97	TEST45	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.694	2026-04-15 14:57:29.855	\N
62	TEST46	99	TEST46	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.697	2026-04-15 14:57:29.855	\N
63	TEST47	101	TEST47	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.701	2026-04-15 14:57:29.855	\N
64	TEST48	103	TEST48	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.704	2026-04-15 14:57:29.855	\N
130	TEST40	87	TEST40	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
131	TEST41	89	TEST41	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
132	TEST42	91	TEST42	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
133	TEST43	93	TEST43	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
134	TEST44	95	TEST44	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
135	TEST45	97	TEST45	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
136	TEST46	99	TEST46	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
137	TEST47	101	TEST47	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
138	TEST48	103	TEST48	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
139	TEST49	105	TEST49	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.87	\N
307		295	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.455	2026-06-20 14:53:18.455	\N
308		297	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.457	2026-06-20 14:53:18.457	\N
233	Test Transfer Product TS	TEST_1779829876342	TEST-MODEL	15	5	0	0	0	0	IN_STORE	1	1	\N	\N	f	0	2026-05-26 21:11:16.343	2026-05-26 21:11:16.343	\N
234	Test Transfer Product TS	TEST_1779829876342	TEST-MODEL	15	0	0	0	0	0	IN_STORE	2	1	\N	2026-05-26 21:11:16.347	t	0	2026-05-26 21:11:16.348	2026-05-26 21:11:16.348	\N
190	TEST37	81	TEST37	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
191	TEST38	83	TEST38	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
192	TEST39	85	TEST39	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
193	TEST4	15	TEST4	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
194	TEST40	87	TEST40	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
195	TEST41	89	TEST41	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
196	TEST42	91	TEST42	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
197	TEST43	93	TEST43	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
198	TEST44	95	TEST44	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
199	TEST45	97	TEST45	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
200	TEST46	99	TEST46	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
201	TEST47	101	TEST47	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
202	TEST48	103	TEST48	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
203	TEST49	105	TEST49	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
204	TEST5	17	TEST5	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.631	2026-04-15 14:52:27.631	\N
309		299	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.46	2026-06-20 14:53:18.46	\N
310		301	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.462	2026-06-20 14:53:18.462	\N
311		303	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.464	2026-06-20 14:53:18.464	\N
312		305	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.468	2026-06-20 14:53:18.468	\N
313		307	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.47	2026-06-20 14:53:18.47	\N
314		309	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.473	2026-06-20 14:53:18.473	\N
315		311	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.475	2026-06-20 14:53:18.475	\N
316		313	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.477	2026-06-20 14:53:18.477	\N
317		315	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.48	2026-06-20 14:53:18.48	\N
318		317	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.482	2026-06-20 14:53:18.482	\N
319		319	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.484	2026-06-20 14:53:18.484	\N
320		321	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.486	2026-06-20 14:53:18.486	\N
321		323	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.489	2026-06-20 14:53:18.489	\N
322		325	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.491	2026-06-20 14:53:18.491	\N
323		327	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.493	2026-06-20 14:53:18.493	\N
205	TEST50	107	TEST50	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
206	TEST51	109	TEST51	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
207	TEST52	111	TEST52	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
208	TEST53	113	TEST53	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
209	TEST54	115	TEST54	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
210	TEST55	117	TEST55	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
211	TEST56	119	TEST56	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
212	TEST57	121	TEST57	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
213	TEST58	123	TEST58	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
214	TEST59	125	TEST59	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
215	TEST6	19	TEST6	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
216	TEST60	127	TEST60	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
217	TEST61	129	TEST61	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
218	TEST62	131	TEST62	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
219	TEST63	133	TEST63	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.671	2026-04-15 14:52:27.671	\N
324		329	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.495	2026-06-20 14:53:18.495	\N
325		331	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.497	2026-06-20 14:53:18.497	\N
326		333	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.499	2026-06-20 14:53:18.499	\N
327		335	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.502	2026-06-20 14:53:18.502	\N
328		337	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.504	2026-06-20 14:53:18.504	\N
329		339	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.506	2026-06-20 14:53:18.506	\N
220	TEST64	135	TEST64	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.693	2026-04-15 14:52:27.693	\N
221	TEST65	137	TEST65	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.693	2026-04-15 14:52:27.693	\N
222	TEST66	139	TEST66	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.693	2026-04-15 14:52:27.693	\N
223	TEST67	141	TEST67	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.693	2026-04-15 14:52:27.693	\N
224	TEST68	143	TEST68	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.693	2026-04-15 14:52:27.693	\N
330		341	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.509	2026-06-20 14:53:18.509	\N
331		343	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.511	2026-06-20 14:53:18.511	\N
225	TEST69	145	TEST69	100	1	0	0	0	0	IN_WAREHOUSE	2	1	150	\N	f	5	2026-04-15 14:52:27.693	2026-04-15 14:52:27.693	\N
101	TEST14	35	TEST14	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-04-15 14:57:29.822	\N
39	TEST23	53	TEST23	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.607	2026-04-15 14:57:29.832	\N
40	TEST24	55	TEST24	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.61	2026-04-15 14:57:29.832	\N
41	TEST25	57	TEST25	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.614	2026-04-15 14:57:29.832	\N
42	TEST26	59	TEST26	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.619	2026-04-15 14:57:29.832	\N
43	TEST27	61	TEST27	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.627	2026-04-15 14:57:29.832	\N
44	TEST28	63	TEST28	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.631	2026-04-15 14:57:29.832	\N
45	TEST29	65	TEST29	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.635	2026-04-15 14:57:29.832	\N
19	TEST3	13	TEST3	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.531	2026-04-15 14:57:29.832	\N
46	TEST30	67	TEST30	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.64	2026-04-15 14:57:29.832	\N
47	TEST31	69	TEST31	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.644	2026-04-15 14:57:29.832	\N
48	TEST32	71	TEST32	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.648	2026-04-15 14:57:29.832	\N
49	TEST33	73	TEST33	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.651	2026-04-15 14:57:29.832	\N
50	TEST34	75	TEST34	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.655	2026-04-15 14:57:29.832	\N
51	TEST35	77	TEST35	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.658	2026-04-15 14:57:29.832	\N
52	TEST36	79	TEST36	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.662	2026-04-15 14:57:29.832	\N
53	TEST37	81	TEST37	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.665	2026-04-15 14:57:29.855	\N
54	TEST38	83	TEST38	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.669	2026-04-15 14:57:29.855	\N
55	TEST39	85	TEST39	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.673	2026-04-15 14:57:29.855	\N
20	TEST4	15	TEST4	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.535	2026-04-15 14:57:29.855	\N
56	TEST40	87	TEST40	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.676	2026-04-15 14:57:29.855	\N
65	TEST49	105	TEST49	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.708	2026-04-15 14:57:29.855	\N
21	TEST5	17	TEST5	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.539	2026-04-15 14:57:29.855	\N
66	TEST50	107	TEST50	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.711	2026-04-15 14:57:29.881	\N
67	TEST51	109	TEST51	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.715	2026-04-15 14:57:29.881	\N
68	TEST52	111	TEST52	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.718	2026-04-15 14:57:29.881	\N
69	TEST53	113	TEST53	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.722	2026-04-15 14:57:29.881	\N
70	TEST54	115	TEST54	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.725	2026-04-15 14:57:29.881	\N
71	TEST55	117	TEST55	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.729	2026-04-15 14:57:29.881	\N
72	TEST56	119	TEST56	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.733	2026-04-15 14:57:29.881	\N
73	TEST57	121	TEST57	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.736	2026-04-15 14:57:29.881	\N
74	TEST58	123	TEST58	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.74	2026-04-15 14:57:29.881	\N
75	TEST59	125	TEST59	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.743	2026-04-15 14:57:29.881	\N
22	TEST6	19	TEST6	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.544	2026-04-15 14:57:29.881	\N
76	TEST60	127	TEST60	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.747	2026-04-15 14:57:29.881	\N
77	TEST61	129	TEST61	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.75	2026-04-15 14:57:29.881	\N
78	TEST62	131	TEST62	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.754	2026-04-15 14:57:29.881	\N
79	TEST63	133	TEST63	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.757	2026-04-15 14:57:29.881	\N
140	TEST50	107	TEST50	100	22	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.709	2026-04-15 14:57:29.896	\N
141	TEST51	109	TEST51	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
142	TEST52	111	TEST52	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
143	TEST53	113	TEST53	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
144	TEST54	115	TEST54	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
145	TEST55	117	TEST55	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
146	TEST56	119	TEST56	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
147	TEST57	121	TEST57	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
148	TEST58	123	TEST58	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
149	TEST59	125	TEST59	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
150	TEST6	19	TEST6	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
151	TEST60	127	TEST60	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
152	TEST61	129	TEST61	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
153	TEST62	131	TEST62	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
100	TEST13	33	TEST13	100	10	0	0	0	0	IN_STORE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-06-18 14:14:36.82	\N
99	TEST12	31	TEST12	100	8	0	0	0	0	IN_STORE	1	1	150	\N	f	5	2026-04-15 14:49:55.631	2026-06-23 12:39:25.32	\N
154	TEST63	133	TEST63	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.743	2026-04-15 14:57:29.896	\N
80	TEST64	135	TEST64	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.761	2026-04-15 14:57:29.908	\N
81	TEST65	137	TEST65	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.765	2026-04-15 14:57:29.908	\N
82	TEST66	139	TEST66	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.768	2026-04-15 14:57:29.908	\N
83	TEST67	141	TEST67	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.772	2026-04-15 14:57:29.908	\N
84	TEST68	143	TEST68	100	988	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.778	2026-04-15 14:57:29.908	\N
85	TEST69	145	TEST69	100	989	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.781	2026-04-15 14:57:29.908	\N
23	TEST7	21	TEST7	100	990	0	0	0	1000	IN_STORE	4	1	150	\N	f	5	2026-04-15 14:47:48.548	2026-04-15 14:57:29.908	\N
155	TEST64	135	TEST64	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.76	2026-04-15 14:57:29.915	\N
156	TEST65	137	TEST65	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.76	2026-04-15 14:57:29.915	\N
157	TEST66	139	TEST66	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.76	2026-04-15 14:57:29.915	\N
158	TEST67	141	TEST67	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.76	2026-04-15 14:57:29.915	\N
159	TEST68	143	TEST68	100	11	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:49:55.76	2026-04-15 14:57:29.915	\N
226	TEST69	145	TEST69	100	10	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:57:29.92	2026-04-15 14:57:29.92	\N
227	TEST7	21	TEST7	100	10	0	0	0	0	IN_WAREHOUSE	1	1	150	\N	f	5	2026-04-15 14:57:29.92	2026-04-15 14:57:29.92	\N
332		345	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.513	2026-06-20 14:53:18.513	\N
333		347	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.516	2026-06-20 14:53:18.516	\N
334		349	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.518	2026-06-20 14:53:18.518	\N
335		351	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.52	2026-06-20 14:53:18.52	\N
336		353	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.522	2026-06-20 14:53:18.522	\N
337		355	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.525	2026-06-20 14:53:18.525	\N
338		357	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.527	2026-06-20 14:53:18.527	\N
339		359	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.53	2026-06-20 14:53:18.53	\N
340		361	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.532	2026-06-20 14:53:18.532	\N
341		363	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.534	2026-06-20 14:53:18.534	\N
342		365	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.536	2026-06-20 14:53:18.536	\N
343		367	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.538	2026-06-20 14:53:18.538	\N
344		369	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.54	2026-06-20 14:53:18.54	\N
345		371	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.542	2026-06-20 14:53:18.542	\N
346		373	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.545	2026-06-20 14:53:18.545	\N
347		375	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.547	2026-06-20 14:53:18.547	\N
348		377	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.549	2026-06-20 14:53:18.549	\N
349		379	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.551	2026-06-20 14:53:18.551	\N
350		381	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.553	2026-06-20 14:53:18.553	\N
351		383	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.555	2026-06-20 14:53:18.555	\N
352		385	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.557	2026-06-20 14:53:18.557	\N
353		387	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.559	2026-06-20 14:53:18.559	\N
354		389	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.561	2026-06-20 14:53:18.561	\N
355		391	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.563	2026-06-20 14:53:18.563	\N
356		393	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.566	2026-06-20 14:53:18.566	\N
357		395	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.568	2026-06-20 14:53:18.568	\N
358		397	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.57	2026-06-20 14:53:18.57	\N
359		399	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.572	2026-06-20 14:53:18.572	\N
360		401	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.575	2026-06-20 14:53:18.575	\N
361		403	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.577	2026-06-20 14:53:18.577	\N
362		405	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.579	2026-06-20 14:53:18.579	\N
363		407	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.581	2026-06-20 14:53:18.581	\N
364		409	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.583	2026-06-20 14:53:18.583	\N
365		411	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.586	2026-06-20 14:53:18.586	\N
366		413	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.588	2026-06-20 14:53:18.588	\N
367		415	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.59	2026-06-20 14:53:18.59	\N
368		417	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.593	2026-06-20 14:53:18.593	\N
369		419	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.595	2026-06-20 14:53:18.595	\N
370		421	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.597	2026-06-20 14:53:18.597	\N
371		423	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.599	2026-06-20 14:53:18.599	\N
372		425	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.601	2026-06-20 14:53:18.601	\N
373		427	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.604	2026-06-20 14:53:18.604	\N
374		429	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.606	2026-06-20 14:53:18.606	\N
383		447	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.626	2026-06-20 14:53:18.626	\N
384		449	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.63	2026-06-20 14:53:18.63	\N
385		451	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.632	2026-06-20 14:53:18.632	\N
386		453	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.634	2026-06-20 14:53:18.634	\N
387		455	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.636	2026-06-20 14:53:18.636	\N
388		457	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.638	2026-06-20 14:53:18.638	\N
389		459	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.64	2026-06-20 14:53:18.64	\N
390		461	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.643	2026-06-20 14:53:18.643	\N
391		463	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.645	2026-06-20 14:53:18.645	\N
392		465	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.647	2026-06-20 14:53:18.647	\N
393		467	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.649	2026-06-20 14:53:18.649	\N
394		469	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.651	2026-06-20 14:53:18.651	\N
395		471	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.653	2026-06-20 14:53:18.653	\N
396		473	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.655	2026-06-20 14:53:18.655	\N
397		475	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.658	2026-06-20 14:53:18.658	\N
398		477	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.66	2026-06-20 14:53:18.66	\N
399		479	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.662	2026-06-20 14:53:18.662	\N
400		481	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.664	2026-06-20 14:53:18.664	\N
401		483	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.666	2026-06-20 14:53:18.666	\N
402		485	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.669	2026-06-20 14:53:18.669	\N
403		487	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.672	2026-06-20 14:53:18.672	\N
404		489	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.674	2026-06-20 14:53:18.674	\N
405		491	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.676	2026-06-20 14:53:18.676	\N
406		493	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.678	2026-06-20 14:53:18.678	\N
407		495	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.68	2026-06-20 14:53:18.68	\N
408		497	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.682	2026-06-20 14:53:18.682	\N
409		499	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.685	2026-06-20 14:53:18.685	\N
410		501	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.69	2026-06-20 14:53:18.69	\N
411		503	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.692	2026-06-20 14:53:18.692	\N
412		505	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.694	2026-06-20 14:53:18.694	\N
413		507	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.698	2026-06-20 14:53:18.698	\N
414		509	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.701	2026-06-20 14:53:18.701	\N
415		511	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.703	2026-06-20 14:53:18.703	\N
416		513	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.705	2026-06-20 14:53:18.705	\N
417		515	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.707	2026-06-20 14:53:18.707	\N
418		517	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.709	2026-06-20 14:53:18.709	\N
419		519	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.712	2026-06-20 14:53:18.712	\N
420		521	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.714	2026-06-20 14:53:18.714	\N
421		523	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.716	2026-06-20 14:53:18.716	\N
422		525	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.718	2026-06-20 14:53:18.718	\N
423		527	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.72	2026-06-20 14:53:18.72	\N
424		529	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.722	2026-06-20 14:53:18.722	\N
425		531	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.724	2026-06-20 14:53:18.724	\N
426		533	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.726	2026-06-20 14:53:18.726	\N
427		535	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.728	2026-06-20 14:53:18.728	\N
428		537	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.73	2026-06-20 14:53:18.73	\N
429		539	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.733	2026-06-20 14:53:18.733	\N
430		541	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.735	2026-06-20 14:53:18.735	\N
431		543	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.737	2026-06-20 14:53:18.737	\N
432		545	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.739	2026-06-20 14:53:18.739	\N
433		547	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.741	2026-06-20 14:53:18.741	\N
434		549	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.743	2026-06-20 14:53:18.743	\N
435		551	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.745	2026-06-20 14:53:18.745	\N
436		553	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.747	2026-06-20 14:53:18.747	\N
437		555	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.749	2026-06-20 14:53:18.749	\N
438		557	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.752	2026-06-20 14:53:18.752	\N
439		559	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.754	2026-06-20 14:53:18.754	\N
440		561	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.757	2026-06-20 14:53:18.757	\N
441		563	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.759	2026-06-20 14:53:18.759	\N
442		565	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.762	2026-06-20 14:53:18.762	\N
443		567	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.764	2026-06-20 14:53:18.764	\N
444		569	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.766	2026-06-20 14:53:18.766	\N
445		571	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.769	2026-06-20 14:53:18.769	\N
446		573	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.771	2026-06-20 14:53:18.771	\N
447		575	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.774	2026-06-20 14:53:18.774	\N
448		577	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.776	2026-06-20 14:53:18.776	\N
449		579	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.779	2026-06-20 14:53:18.779	\N
450		581	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.781	2026-06-20 14:53:18.781	\N
451		583	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.783	2026-06-20 14:53:18.783	\N
452		585	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.785	2026-06-20 14:53:18.785	\N
453		587	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.787	2026-06-20 14:53:18.787	\N
454		589	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.79	2026-06-20 14:53:18.79	\N
455		591	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.792	2026-06-20 14:53:18.792	\N
456		593	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.795	2026-06-20 14:53:18.795	\N
457		595	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.797	2026-06-20 14:53:18.797	\N
458		597	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.799	2026-06-20 14:53:18.799	\N
459		599	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.801	2026-06-20 14:53:18.801	\N
460		601	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.803	2026-06-20 14:53:18.803	\N
461		603	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.806	2026-06-20 14:53:18.806	\N
462		605	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.808	2026-06-20 14:53:18.808	\N
463		607	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.811	2026-06-20 14:53:18.811	\N
464		609	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.813	2026-06-20 14:53:18.813	\N
465		611	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.815	2026-06-20 14:53:18.815	\N
466		613	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.817	2026-06-20 14:53:18.817	\N
467		615	\N	0	0	0	0	0	0	IN_WAREHOUSE	5	2	\N	\N	f	0	2026-06-20 14:53:18.819	2026-06-20 14:53:18.819	\N
468	PELESOS	617	ROSSO VC 1000	70	59	0	0	0	59	IN_WAREHOUSE	5	1	78.51529412	\N	f	10	2026-06-20 14:56:56.244	2026-06-20 14:56:56.244	\N
469	XOLODILNIK	619	VOLMER 521 BSI BLACK	750	2	0	0	0	2	IN_WAREHOUSE	5	1	764.7058824	\N	f	10	2026-06-20 14:56:56.254	2026-06-20 14:56:56.254	\N
470	AVTAMAT	621	VOLMER T55LD8DD	350	15	0	0	0	15	IN_WAREHOUSE	5	1	356.8627451	\N	f	10	2026-06-20 14:56:56.258	2026-06-20 14:56:56.258	\N
471	TELEVIZOR	623	MOONX 32 WEBOS	115	10	0	0	0	10	IN_WAREHOUSE	5	1	128	\N	f	10	2026-06-20 14:56:56.262	2026-06-20 14:56:56.262	\N
472	Nomi	625	Madeli	116	10	0	0	0	10	IN_WAREHOUSE	5	1	129	\N	f	11	2026-06-20 14:56:56.266	2026-06-20 14:56:56.266	\N
473	T1	627	M1	117	10	0	0	0	10	IN_WAREHOUSE	5	1	130	\N	f	12	2026-06-20 14:56:56.27	2026-06-20 14:56:56.27	\N
474	T2	629	M2	118	10	0	0	0	10	IN_WAREHOUSE	5	1	131	\N	f	13	2026-06-20 14:56:56.274	2026-06-20 14:56:56.274	\N
475	T3	631	M3	119	10	0	0	0	10	IN_WAREHOUSE	5	1	132	\N	f	14	2026-06-20 14:56:56.277	2026-06-20 14:56:56.277	\N
476	T4	633	M4	120	10	0	0	0	10	IN_WAREHOUSE	5	1	133	\N	f	15	2026-06-20 14:56:56.281	2026-06-20 14:56:56.281	\N
477	T5	635	M5	121	10	0	0	0	10	IN_WAREHOUSE	5	1	134	\N	f	16	2026-06-20 14:56:56.284	2026-06-20 14:56:56.284	\N
478	T6	637	M6	122	10	0	0	0	10	IN_WAREHOUSE	5	1	135	\N	f	17	2026-06-20 14:56:56.288	2026-06-20 14:56:56.288	\N
479	T7	639	M7	123	10	0	0	0	10	IN_WAREHOUSE	5	1	136	\N	f	18	2026-06-20 14:56:56.291	2026-06-20 14:56:56.291	\N
480	T8	641	M8	124	10	0	0	0	10	IN_WAREHOUSE	5	1	137	\N	f	19	2026-06-20 14:56:56.295	2026-06-20 14:56:56.295	\N
481	T9	643	M9	125	10	0	0	0	10	IN_WAREHOUSE	5	1	138	\N	f	20	2026-06-20 14:56:56.298	2026-06-20 14:56:56.298	\N
482	T10	645	M10	126	10	0	0	0	10	IN_WAREHOUSE	5	1	139	\N	f	21	2026-06-20 14:56:56.302	2026-06-20 14:56:56.302	\N
483	T11	647	M11	127	10	0	0	0	10	IN_WAREHOUSE	5	1	140	\N	f	22	2026-06-20 14:56:56.305	2026-06-20 14:56:56.305	\N
484	T12	649	M12	128	10	0	0	0	10	IN_WAREHOUSE	5	1	141	\N	f	23	2026-06-20 14:56:56.309	2026-06-20 14:56:56.309	\N
485	T13	651	M13	129	10	0	0	0	10	IN_WAREHOUSE	5	1	142	\N	f	24	2026-06-20 14:56:56.312	2026-06-20 14:56:56.312	\N
486	T14	653	M14	130	10	0	0	0	10	IN_WAREHOUSE	5	1	143	\N	f	25	2026-06-20 14:56:56.316	2026-06-20 14:56:56.316	\N
487	T15	655	M15	131	10	0	0	0	10	IN_WAREHOUSE	5	1	144	\N	f	26	2026-06-20 14:56:56.319	2026-06-20 14:56:56.319	\N
488	T16	657	M16	132	10	0	0	0	10	IN_WAREHOUSE	5	1	145	\N	f	27	2026-06-20 14:56:56.323	2026-06-20 14:56:56.323	\N
489	T17	659	M17	133	10	0	0	0	10	IN_WAREHOUSE	5	1	146	\N	f	28	2026-06-20 14:56:56.326	2026-06-20 14:56:56.326	\N
490	T18	661	M18	134	10	0	0	0	10	IN_WAREHOUSE	5	1	147	\N	f	29	2026-06-20 14:56:56.329	2026-06-20 14:56:56.329	\N
491	T19	663	M19	135	10	0	0	0	10	IN_WAREHOUSE	5	1	148	\N	f	30	2026-06-20 14:56:56.334	2026-06-20 14:56:56.334	\N
492	T20	665	M20	136	10	0	0	0	10	IN_WAREHOUSE	5	1	149	\N	f	31	2026-06-20 14:56:56.339	2026-06-20 14:56:56.339	\N
493	T21	667	M21	137	10	0	0	0	10	IN_WAREHOUSE	5	1	150	\N	f	32	2026-06-20 14:56:56.348	2026-06-20 14:56:56.348	\N
494	T22	669	M22	138	10	0	0	0	10	IN_WAREHOUSE	5	1	151	\N	f	33	2026-06-20 14:56:56.352	2026-06-20 14:56:56.352	\N
495	T23	671	M23	139	10	0	0	0	10	IN_WAREHOUSE	5	1	152	\N	f	34	2026-06-20 14:56:56.356	2026-06-20 14:56:56.356	\N
496	T24	673	M24	140	10	0	0	0	10	IN_WAREHOUSE	5	1	153	\N	f	35	2026-06-20 14:56:56.36	2026-06-20 14:56:56.36	\N
497	T25	675	M25	141	10	0	0	0	10	IN_WAREHOUSE	5	1	154	\N	f	36	2026-06-20 14:56:56.363	2026-06-20 14:56:56.363	\N
498	T26	677	M26	142	10	0	0	0	10	IN_WAREHOUSE	5	1	155	\N	f	37	2026-06-20 14:56:56.367	2026-06-20 14:56:56.367	\N
499	T27	679	M27	143	10	0	0	0	10	IN_WAREHOUSE	5	1	156	\N	f	38	2026-06-20 14:56:56.37	2026-06-20 14:56:56.37	\N
500	T28	681	M28	144	10	0	0	0	10	IN_WAREHOUSE	5	1	157	\N	f	39	2026-06-20 14:56:56.373	2026-06-20 14:56:56.373	\N
501	T29	683	M29	145	10	0	0	0	10	IN_WAREHOUSE	5	1	158	\N	f	40	2026-06-20 14:56:56.377	2026-06-20 14:56:56.377	\N
502	T30	685	M30	146	10	0	0	0	10	IN_WAREHOUSE	5	1	159	\N	f	41	2026-06-20 14:56:56.381	2026-06-20 14:56:56.381	\N
503	T31	687	M31	147	10	0	0	0	10	IN_WAREHOUSE	5	1	160	\N	f	42	2026-06-20 14:56:56.385	2026-06-20 14:56:56.385	\N
504	T32	689	M32	148	10	0	0	0	10	IN_WAREHOUSE	5	1	161	\N	f	43	2026-06-20 14:56:56.388	2026-06-20 14:56:56.388	\N
505	T33	691	M33	149	10	0	0	0	10	IN_WAREHOUSE	5	1	162	\N	f	44	2026-06-20 14:56:56.392	2026-06-20 14:56:56.392	\N
506	T34	693	M34	150	10	0	0	0	10	IN_WAREHOUSE	5	1	163	\N	f	45	2026-06-20 14:56:56.396	2026-06-20 14:56:56.396	\N
507	T35	695	M35	151	10	0	0	0	10	IN_WAREHOUSE	5	1	164	\N	f	46	2026-06-20 14:56:56.399	2026-06-20 14:56:56.399	\N
508	T36	697	M36	152	10	0	0	0	10	IN_WAREHOUSE	5	1	165	\N	f	47	2026-06-20 14:56:56.403	2026-06-20 14:56:56.403	\N
509	T37	699	M37	153	10	0	0	0	10	IN_WAREHOUSE	5	1	166	\N	f	48	2026-06-20 14:56:56.406	2026-06-20 14:56:56.406	\N
510	T38	701	M38	154	10	0	0	0	10	IN_WAREHOUSE	5	1	167	\N	f	49	2026-06-20 14:56:56.409	2026-06-20 14:56:56.409	\N
511	T39	703	M39	155	10	0	0	0	10	IN_WAREHOUSE	5	1	168	\N	f	50	2026-06-20 14:56:56.414	2026-06-20 14:56:56.414	\N
512	T40	705	M40	156	10	0	0	0	10	IN_WAREHOUSE	5	1	169	\N	f	51	2026-06-20 14:56:56.417	2026-06-20 14:56:56.417	\N
513	T41	707	M41	157	10	0	0	0	10	IN_WAREHOUSE	5	1	170	\N	f	52	2026-06-20 14:56:56.42	2026-06-20 14:56:56.42	\N
514	T42	709	M42	158	10	0	0	0	10	IN_WAREHOUSE	5	1	171	\N	f	53	2026-06-20 14:56:56.423	2026-06-20 14:56:56.423	\N
515	T43	711	M43	159	10	0	0	0	10	IN_WAREHOUSE	5	1	172	\N	f	54	2026-06-20 14:56:56.427	2026-06-20 14:56:56.427	\N
516	T44	713	M44	160	10	0	0	0	10	IN_WAREHOUSE	5	1	173	\N	f	55	2026-06-20 14:56:56.43	2026-06-20 14:56:56.43	\N
\.


--
-- Data for Name: ProductTransfer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductTransfer" (id, "productId", "fromBranchId", "toBranchId", quantity, status, "initiatedById", "approvedById", "transferDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Task" (id, "auditorId", "transactionId", status, "createdAt", "updatedAt", "isUydanCollected", "uydanAmount", "uydanCollectNote", "uydanCollectedAt", "uydanCollectedById", "uydanCollectedAmount") FROM stdin;
6	10	105	ACCEPTED	2026-02-12 20:03:23.813	2026-02-12 20:04:14.194	f	0	\N	\N	\N	0
7	10	234	ACCEPTED	2026-04-21 15:48:03.765	2026-04-21 15:48:48.175	t	1000000	\N	2026-04-21 15:48:48.174	10	0
8	10	236	ACCEPTED	2026-04-21 15:58:18.626	2026-04-21 16:05:37.492	f	1500000	[COLLECTED=600000] Qabul qilingan summa: 600000.	2026-04-21 16:05:37.492	10	0
9	10	238	ACCEPTED	2026-04-21 16:32:02.688	2026-04-21 16:33:18.349	f	1000000	[COLLECTED=300000] Qabul qilingan summa: 300000. Qolganini barmijak	2026-04-21 16:33:18.348	10	0
10	10	242	ACCEPTED	2026-04-23 16:01:53.459	2026-05-13 17:57:20.152	f	500000	\N	\N	\N	0
11	10	261	DELIVERED	2026-05-13 17:59:38.401	2026-06-16 12:25:17.633	f	0	\N	\N	\N	0
12	\N	324	PENDING	2026-06-23 12:39:25.327	2026-06-23 12:39:25.327	f	1300000	\N	\N	\N	0
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Transaction" (id, "customerId", "userId", "soldByUserId", "fromBranchId", "toBranchId", type, "transactionType", status, discount, total, "finalTotal", "paymentType", "deliveryMethod", "deliveryType", "deliveryAddress", "amountPaid", "downPayment", "remainingBalance", "receiptId", description, "creditRepaymentAmount", "lastRepaymentDate", "createdAt", "updatedAt", "upfrontPaymentType", "termUnit", days, months, "extraProfit", "updatedById") FROM stdin;
127	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	750000	750000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 14:40:24.142	2026-04-09 14:40:24.142	\N	\N	\N	\N	0	\N
96	69	6	7	1	\N	SALE	\N	PENDING	0	1000	1000	TERMINAL	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-28 10:50:06.446	2025-11-28 18:03:53.564	CASH	MONTHS	0	0	50000	\N
112	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	10000000	10000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-14 20:36:58.988	2026-03-14 20:36:58.988	\N	\N	\N	\N	0	\N
97	70	6	7	1	\N	SALE	\N	PENDING	0	200000	200000	TERMINAL	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-28 18:05:01.288	2025-11-28 18:05:14.697	CASH	MONTHS	0	2	50000	\N
113	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	10000000	10000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-14 20:37:47.035	2026-03-14 20:37:47.035	\N	\N	\N	\N	0	\N
98	71	6	7	1	\N	SALE	\N	PENDING	0	200000	200000	TERMINAL	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-28 18:05:35.915	2025-11-28 18:05:52.485	CASH	MONTHS	0	0	50000	\N
114	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	100000000	100000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-14 20:48:50.303	2026-03-14 20:48:50.303	\N	\N	\N	\N	0	\N
99	72	6	7	1	\N	SALE	\N	PENDING	0	200000	200000	CARD	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-28 18:06:18.715	2025-11-28 18:06:35.198	CASH	MONTHS	0	0	50000	\N
100	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	2000000	2000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2025-11-30 18:45:04.923	2025-11-30 18:45:04.923	\N	\N	\N	\N	0	\N
101	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	1000000	1000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2025-11-30 18:46:03.006	2025-11-30 18:46:03.006	\N	\N	\N	\N	0	\N
102	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	34400000	34400000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2025-11-30 18:46:27.39	2025-11-30 18:46:27.39	\N	\N	\N	\N	0	\N
90	64	6	7	1	\N	SALE	\N	PENDING	0	0	0	\N	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-23 14:29:56.601	2025-11-23 14:30:12.466	CASH	MONTHS	0	0	0	\N
91	65	6	7	1	\N	SALE	\N	PENDING	0	200000	200000	\N	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-23 15:08:33.729	2025-11-23 15:08:35.806	CASH	MONTHS	0	0	100000	\N
103	55	6	7	1	\N	SALE	\N	PENDING	0	400000	400000	CASH	PICKUP	\N		0	0	400000	\N	\N	0	\N	2026-01-30 17:51:02.789	2026-01-30 17:51:05.037	CASH	MONTHS	0	0	200000	\N
92	66	6	7	1	\N	SALE	\N	PENDING	0	0	0	CASH	PICKUP	\N		0	0	3440000	\N	\N	0	\N	2025-11-28 09:40:11.104	2025-11-28 09:40:26.946	CASH	MONTHS	0	0	0	\N
104	55	6	7	1	\N	SALE	\N	PENDING	0	3440000	3440000	CASH	PICKUP	\N		0	0	3440000	\N	\N	0	\N	2026-01-30 17:58:51.879	2026-01-30 17:58:53.941	CASH	MONTHS	0	0	1110000	\N
93	67	6	7	1	\N	SALE	\N	PENDING	0	0	0	TERMINAL	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-28 10:42:56.099	2025-11-28 10:43:14.687	CASH	MONTHS	0	0	50000	\N
105	71	15	7	1	\N	SALE	\N	PENDING	0	1000000	1000000	CASH	DELIVERY	\N	1112	0	0	1000000	\N	\N	0	\N	2026-02-12 20:03:23.787	2026-02-12 20:03:25.836	CASH	MONTHS	0	0	500000	\N
94	68	6	7	1	\N	SALE	\N	PENDING	0	0	0	TERMINAL	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-28 10:49:08.56	2025-11-28 10:49:22.912	CASH	MONTHS	0	0	50000	\N
95	69	6	7	1	\N	SALE	\N	PENDING	0	200000	200000	CASH	PICKUP	\N		0	0	200000	\N	\N	0	\N	2025-11-28 10:49:48.589	2025-11-28 10:49:50.626	CASH	MONTHS	0	0	100000	\N
106	74	15	7	1	\N	SALE	\N	PENDING	0	1000000	1000000	\N	PICKUP	\N		0	0	1000000	\N	\N	0	\N	2026-02-13 18:35:48.064	2026-02-13 18:35:50.383	CASH	MONTHS	0	0	500000	\N
128	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:10:12.713	2026-04-09 20:10:12.713	\N	\N	\N	\N	0	\N
108	75	15	7	1	\N	SALE	\N	PENDING	0	1000000	1000000	\N	PICKUP	\N		0	0	1000000	\N	\N	0	\N	2026-02-13 18:42:37.057	2026-02-13 18:42:39.109	CASH	MONTHS	0	0	500000	\N
107	71	15	7	1	\N	SALE	\N	PENDING	0	1000000	1200000	CREDIT	PICKUP	\N		0	0	1200000	\N	\N	0	2026-02-13 18:48:04.689	2026-02-13 18:39:17.023	2026-02-13 18:48:04.734	CASH	MONTHS	0	6	500000	\N
115	79	15	7	1	\N	SALE	\N	PENDING	0	2000000	2000000	CASH	PICKUP	\N		0	0	2000000	\N	\N	0	\N	2026-03-14 20:52:16.261	2026-03-14 20:54:18.581	CASH	MONTHS	0	0	500000	\N
109	76	15	7	1	\N	SALE	\N	PENDING	0	1000000	1000000	\N	PICKUP	\N		0	0	1000000	\N	\N	0	2026-02-13 19:19:04.925	2026-02-13 18:53:12.061	2026-02-13 19:19:04.998	CASH	MONTHS	0	0	500000	\N
110	77	15	7	1	\N	SALE	\N	PENDING	0	1000000	1000000	\N	PICKUP	\N		0	0	1000000	\N	\N	0	\N	2026-02-13 19:20:01.26	2026-02-13 19:20:03.314	CASH	MONTHS	0	0	500000	\N
129	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:10:21.232	2026-04-09 20:10:21.232	\N	\N	\N	\N	0	\N
111	78	15	7	1	\N	SALE	\N	PENDING	0	1000000	1000000	\N	PICKUP	\N		0	0	1000000	\N	\N	0	2026-03-14 21:08:22.377	2026-02-13 19:25:33.906	2026-03-14 21:08:22.424	CASH	MONTHS	0	0	500000	\N
116	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-03-19 19:30:08.138	2026-03-19 19:30:08.138	\N	\N	\N	\N	0	\N
117	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-19 19:31:00.14	2026-03-19 19:31:00.14	\N	\N	\N	\N	0	\N
118	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-19 19:38:17.737	2026-03-19 19:38:17.737	\N	\N	\N	\N	0	\N
119	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	750000	750000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-19 19:40:11.319	2026-03-19 19:40:11.319	\N	\N	\N	\N	0	\N
120	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	450000	450000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-19 19:57:08.332	2026-03-19 19:57:08.332	\N	\N	\N	\N	0	\N
121	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	450000	450000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-19 20:04:19.068	2026-03-19 20:04:19.068	\N	\N	\N	\N	0	\N
122	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-19 20:11:15.244	2026-03-19 20:11:15.244	\N	\N	\N	\N	0	\N
123	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	1500000	1500000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-03-19 20:23:44.479	2026-03-19 20:23:44.479	\N	\N	\N	\N	0	\N
124	80	6	7	1	\N	SALE	\N	PENDING	0	2000000	2000000	CASH	PICKUP	\N		0	0	2000000	\N	\N	0	\N	2026-04-06 18:10:47.624	2026-04-06 18:10:49.771	CASH	MONTHS	0	0	1370000	\N
125	81	6	7	1	\N	SALE	\N	PENDING	0	1000000	1000000	CASH	PICKUP	\N		0	0	1000000	\N	\N	0	\N	2026-04-06 18:13:59.982	2026-04-06 18:14:02.027	CASH	MONTHS	0	0	500000	\N
126	82	6	7	1	\N	SALE	\N	PENDING	0	150000	150000	CASH	PICKUP	\N		0	0	150000	\N	\N	0	\N	2026-04-06 18:41:00.716	2026-04-06 18:41:02.774	CASH	MONTHS	0	0	20000	\N
130	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:10:30.946	2026-04-09 20:10:30.946	\N	\N	\N	\N	0	\N
131	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:10:37.744	2026-04-09 20:10:37.744	\N	\N	\N	\N	0	\N
132	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:11:10.327	2026-04-09 20:11:10.327	\N	\N	\N	\N	0	\N
133	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:11:14.859	2026-04-09 20:11:14.859	\N	\N	\N	\N	0	\N
134	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:11:20.226	2026-04-09 20:11:20.226	\N	\N	\N	\N	0	\N
135	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:11:25.009	2026-04-09 20:11:25.009	\N	\N	\N	\N	0	\N
136	\N	\N	\N	1	3	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:11:28.875	2026-04-09 20:11:28.875	\N	\N	\N	\N	0	\N
137	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:13:18.536	2026-04-09 20:13:18.536	\N	\N	\N	\N	0	\N
138	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:13:23.575	2026-04-09 20:13:23.575	\N	\N	\N	\N	0	\N
139	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:13:28.156	2026-04-09 20:13:28.156	\N	\N	\N	\N	0	\N
140	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:13:32.489	2026-04-09 20:13:32.489	\N	\N	\N	\N	0	\N
141	\N	\N	\N	1	2	TRANSFER	\N	PENDING	0	150000	150000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-09 20:13:37.438	2026-04-09 20:13:37.438	\N	\N	\N	\N	0	\N
142	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 10:04:26.275	2026-04-15 10:04:26.275	\N	\N	\N	\N	0	\N
143	\N	\N	\N	3	2	TRANSFER	\N	PENDING	0	12400000	12400000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-15 10:08:45.885	2026-04-15 10:08:45.885	\N	\N	\N	\N	0	\N
144	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.518	2026-04-15 14:47:48.518	\N	\N	\N	\N	0	\N
145	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.527	2026-04-15 14:47:48.527	\N	\N	\N	\N	0	\N
146	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.532	2026-04-15 14:47:48.532	\N	\N	\N	\N	0	\N
147	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.536	2026-04-15 14:47:48.536	\N	\N	\N	\N	0	\N
148	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.54	2026-04-15 14:47:48.54	\N	\N	\N	\N	0	\N
149	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.544	2026-04-15 14:47:48.544	\N	\N	\N	\N	0	\N
150	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.548	2026-04-15 14:47:48.548	\N	\N	\N	\N	0	\N
151	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.552	2026-04-15 14:47:48.552	\N	\N	\N	\N	0	\N
152	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.556	2026-04-15 14:47:48.556	\N	\N	\N	\N	0	\N
153	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.56	2026-04-15 14:47:48.56	\N	\N	\N	\N	0	\N
154	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.563	2026-04-15 14:47:48.563	\N	\N	\N	\N	0	\N
155	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.567	2026-04-15 14:47:48.567	\N	\N	\N	\N	0	\N
156	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.57	2026-04-15 14:47:48.57	\N	\N	\N	\N	0	\N
157	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.574	2026-04-15 14:47:48.574	\N	\N	\N	\N	0	\N
158	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.578	2026-04-15 14:47:48.578	\N	\N	\N	\N	0	\N
159	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.582	2026-04-15 14:47:48.582	\N	\N	\N	\N	0	\N
160	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.585	2026-04-15 14:47:48.585	\N	\N	\N	\N	0	\N
161	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.589	2026-04-15 14:47:48.589	\N	\N	\N	\N	0	\N
162	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.592	2026-04-15 14:47:48.592	\N	\N	\N	\N	0	\N
163	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.596	2026-04-15 14:47:48.596	\N	\N	\N	\N	0	\N
164	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.6	2026-04-15 14:47:48.6	\N	\N	\N	\N	0	\N
165	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.603	2026-04-15 14:47:48.603	\N	\N	\N	\N	0	\N
166	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.607	2026-04-15 14:47:48.607	\N	\N	\N	\N	0	\N
167	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.611	2026-04-15 14:47:48.611	\N	\N	\N	\N	0	\N
168	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.615	2026-04-15 14:47:48.615	\N	\N	\N	\N	0	\N
169	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.62	2026-04-15 14:47:48.62	\N	\N	\N	\N	0	\N
170	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.628	2026-04-15 14:47:48.628	\N	\N	\N	\N	0	\N
171	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.632	2026-04-15 14:47:48.632	\N	\N	\N	\N	0	\N
172	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.636	2026-04-15 14:47:48.636	\N	\N	\N	\N	0	\N
173	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.641	2026-04-15 14:47:48.641	\N	\N	\N	\N	0	\N
174	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.645	2026-04-15 14:47:48.645	\N	\N	\N	\N	0	\N
175	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.648	2026-04-15 14:47:48.648	\N	\N	\N	\N	0	\N
176	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.652	2026-04-15 14:47:48.652	\N	\N	\N	\N	0	\N
177	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.655	2026-04-15 14:47:48.655	\N	\N	\N	\N	0	\N
178	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.659	2026-04-15 14:47:48.659	\N	\N	\N	\N	0	\N
179	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.662	2026-04-15 14:47:48.662	\N	\N	\N	\N	0	\N
180	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.666	2026-04-15 14:47:48.666	\N	\N	\N	\N	0	\N
181	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.67	2026-04-15 14:47:48.67	\N	\N	\N	\N	0	\N
182	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.673	2026-04-15 14:47:48.673	\N	\N	\N	\N	0	\N
183	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.677	2026-04-15 14:47:48.677	\N	\N	\N	\N	0	\N
184	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.68	2026-04-15 14:47:48.68	\N	\N	\N	\N	0	\N
185	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.684	2026-04-15 14:47:48.684	\N	\N	\N	\N	0	\N
186	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.688	2026-04-15 14:47:48.688	\N	\N	\N	\N	0	\N
187	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.691	2026-04-15 14:47:48.691	\N	\N	\N	\N	0	\N
188	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.694	2026-04-15 14:47:48.694	\N	\N	\N	\N	0	\N
189	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.698	2026-04-15 14:47:48.698	\N	\N	\N	\N	0	\N
190	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.702	2026-04-15 14:47:48.702	\N	\N	\N	\N	0	\N
191	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.705	2026-04-15 14:47:48.705	\N	\N	\N	\N	0	\N
192	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.709	2026-04-15 14:47:48.709	\N	\N	\N	\N	0	\N
193	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.712	2026-04-15 14:47:48.712	\N	\N	\N	\N	0	\N
194	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.716	2026-04-15 14:47:48.716	\N	\N	\N	\N	0	\N
195	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.719	2026-04-15 14:47:48.719	\N	\N	\N	\N	0	\N
196	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.723	2026-04-15 14:47:48.723	\N	\N	\N	\N	0	\N
197	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.726	2026-04-15 14:47:48.726	\N	\N	\N	\N	0	\N
198	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.73	2026-04-15 14:47:48.73	\N	\N	\N	\N	0	\N
199	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.733	2026-04-15 14:47:48.733	\N	\N	\N	\N	0	\N
200	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.737	2026-04-15 14:47:48.737	\N	\N	\N	\N	0	\N
201	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.74	2026-04-15 14:47:48.74	\N	\N	\N	\N	0	\N
202	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.744	2026-04-15 14:47:48.744	\N	\N	\N	\N	0	\N
203	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.747	2026-04-15 14:47:48.747	\N	\N	\N	\N	0	\N
204	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.751	2026-04-15 14:47:48.751	\N	\N	\N	\N	0	\N
205	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.754	2026-04-15 14:47:48.754	\N	\N	\N	\N	0	\N
206	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.758	2026-04-15 14:47:48.758	\N	\N	\N	\N	0	\N
207	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.762	2026-04-15 14:47:48.762	\N	\N	\N	\N	0	\N
208	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.765	2026-04-15 14:47:48.765	\N	\N	\N	\N	0	\N
209	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.769	2026-04-15 14:47:48.769	\N	\N	\N	\N	0	\N
210	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.772	2026-04-15 14:47:48.772	\N	\N	\N	\N	0	\N
211	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.779	2026-04-15 14:47:48.779	\N	\N	\N	\N	0	\N
212	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.782	2026-04-15 14:47:48.782	\N	\N	\N	\N	0	\N
213	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.785	2026-04-15 14:47:48.785	\N	\N	\N	\N	0	\N
214	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.79	2026-04-15 14:47:48.79	\N	\N	\N	\N	0	\N
215	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.793	2026-04-15 14:47:48.793	\N	\N	\N	\N	0	\N
216	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.796	2026-04-15 14:47:48.796	\N	\N	\N	\N	0	\N
217	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.799	2026-04-15 14:47:48.799	\N	\N	\N	\N	0	\N
218	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.803	2026-04-15 14:47:48.803	\N	\N	\N	\N	0	\N
219	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.807	2026-04-15 14:47:48.807	\N	\N	\N	\N	0	\N
220	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.81	2026-04-15 14:47:48.81	\N	\N	\N	\N	0	\N
221	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.814	2026-04-15 14:47:48.814	\N	\N	\N	\N	0	\N
222	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-04-15 14:47:48.817	2026-04-15 14:47:48.817	\N	\N	\N	\N	0	\N
223	\N	\N	\N	4	1	TRANSFER	\N	PENDING	0	97500000	97500000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	\N	\N	\N	\N	0	\N
224	\N	\N	\N	4	2	TRANSFER	\N	PENDING	0	99000000	99000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	\N	\N	\N	\N	0	\N
225	\N	\N	\N	4	1	TRANSFER	\N	PENDING	0	1005000000	1005000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	\N	\N	\N	\N	0	\N
231	92	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-21 15:33:05.691	2026-04-21 15:33:07.744	CASH	MONTHS	0	0	500000	\N
226	87	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	2026-04-20 15:41:14.837	2026-04-20 15:27:16.985	2026-04-20 15:41:14.886	CASH	MONTHS	0	0	500000	\N
227	88	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-20 15:49:08.121	2026-04-20 15:49:10.169	CASH	MONTHS	0	0	500000	\N
228	89	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-20 15:56:02.104	2026-04-20 15:56:04.156	CASH	MONTHS	0	0	500000	\N
229	90	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-20 16:00:25.145	2026-04-20 16:00:27.21	CASH	MONTHS	0	0	500000	\N
230	91	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-21 14:03:55.192	2026-04-21 14:03:57.26	CASH	MONTHS	0	0	500000	\N
234	94	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	DELIVERY	\N	wqdqwdqddqw	0	0	1500000	\N	\N	0	\N	2026-04-21 15:48:03.74	2026-04-21 15:48:05.79	CASH	MONTHS	0	0	500000	\N
232	93	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	2026-04-21 15:39:01.182	2026-04-21 15:35:29.4	2026-04-21 15:39:01.204	CASH	MONTHS	0	0	500000	\N
233	55	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	2026-04-21 15:38:35.116	2026-04-21 15:36:24.916	2026-04-21 15:38:35.157	CASH	MONTHS	0	0	500000	\N
235	95	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	500000	2026-06-19 13:56:03.101	2026-04-21 15:52:43.853	2026-06-19 13:56:03.149	CASH	MONTHS	0	0	500000	\N
237	97	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-21 16:28:52.133	2026-06-19 14:04:11.315	CASH	MONTHS	0	0	500000	\N
238	98	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	DELIVERY	\N	ert	0	0	1500000	\N	\N	0	\N	2026-04-21 16:32:02.668	2026-04-21 16:32:04.7	CASH	MONTHS	0	0	500000	\N
236	96	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	DELIVERY	\N	1q1q	0	0	1500000	\N	\N	1500000	2026-04-25 19:52:19.325	2026-04-21 15:58:18.606	2026-04-25 19:52:19.359	CASH	MONTHS	0	0	500000	\N
239	99	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CARD	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-22 15:07:49.817	2026-04-22 15:07:51.905	CASH	MONTHS	0	0	500000	\N
282	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.281	2026-06-20 14:56:56.281	\N	\N	\N	\N	0	\N
283	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.285	2026-06-20 14:56:56.285	\N	\N	\N	\N	0	\N
241	101	15	7	1	\N	SALE	\N	PENDING	0	1500000	1650000	INSTALLMENT	PICKUP	\N		0	0	1650000	\N	\N	825000	2026-04-27 20:21:44.552	2026-04-22 15:10:44.796	2026-04-27 20:21:44.596	CASH	MONTHS	0	4	500000	\N
243	103	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-23 16:03:53.488	2026-04-23 16:03:55.525	CASH	MONTHS	0	0	500000	\N
242	102	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	DELIVERY	\N	ewr	0	0	1500000	\N	\N	0	2026-04-23 16:09:28.25	2026-04-23 16:01:53.428	2026-04-23 16:09:28.286	CASH	MONTHS	0	0	500000	\N
240	100	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	2026-04-24 18:41:44.882	2026-04-22 15:09:03.121	2026-04-24 18:42:27.967	CASH	MONTHS	0	0	500000	\N
258	115	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	\N	PICKUP	\N		0	0	1500000	\N	\N	1500000	2026-04-27 21:39:38.604	2026-04-27 19:17:47.554	2026-04-27 21:39:38.658	CASH	MONTHS	0	0	500000	\N
284	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.288	2026-06-20 14:56:56.288	\N	\N	\N	\N	0	\N
256	113	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-24 19:59:20.098	2026-04-24 19:59:22.163	CASH	MONTHS	0	0	500000	\N
261	117	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	DELIVERY	\N	wefew	0	0	1500000	\N	\N	0	\N	2026-05-13 17:59:38.378	2026-05-13 17:59:40.43	CASH	MONTHS	0	0	500000	\N
257	114	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	500000	2026-04-25 20:04:49.305	2026-04-24 20:03:28.024	2026-04-25 20:04:49.341	CASH	MONTHS	0	0	500000	\N
262	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-05-22 09:30:06.665	2026-05-22 09:30:06.665	\N	\N	\N	\N	0	\N
263	\N	8	8	4	2	TRANSFER	\N	PENDING	0	2800000	2800000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-05-22 09:32:47.94	2026-05-22 09:32:47.94	\N	\N	\N	\N	0	\N
264	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-05-26 21:03:27.111	2026-05-26 21:03:27.111	\N	\N	\N	\N	0	\N
254	111	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	0	2026-04-24 18:12:18.891	2026-04-24 18:11:57.745	2026-04-24 18:12:18.927	CASH	MONTHS	0	0	500000	\N
265	\N	8	8	4	\N	PURCHASE	\N	PENDING	0	1200	1200	\N	\N	\N	\N	\N	\N	1200	\N	\N	0	\N	2026-05-26 21:03:43.206	2026-05-26 21:03:43.206	CASH	MONTHS	0	0	0	\N
285	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.292	2026-06-20 14:56:56.292	\N	\N	\N	\N	0	\N
266	\N	8	8	4	2	TRANSFER	\N	PENDING	0	12000000	12000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-05-26 21:04:04.062	2026-05-26 21:04:04.062	\N	\N	\N	\N	0	\N
267	\N	8	8	4	2	TRANSFER	\N	PENDING	0	12000000	12000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-05-26 21:10:48.622	2026-05-26 21:10:48.622	\N	\N	\N	\N	0	\N
270	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-05-26 21:13:09.129	2026-05-26 21:13:09.129	\N	\N	\N	\N	0	\N
271	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-05-26 21:13:39.728	2026-05-26 21:13:39.728	\N	\N	\N	\N	0	\N
273	\N	2	2	4	3	TRANSFER	\N	PENDING	0	13400000	13400000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-06-19 11:42:35.409	2026-06-19 11:42:35.409	\N	\N	\N	\N	0	\N
286	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.295	2026-06-20 14:56:56.295	\N	\N	\N	\N	0	\N
260	109	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	CASH	PICKUP	\N		0	0	1500000	\N	\N	1500000	2026-04-27 19:45:19.897	2026-04-27 19:41:48.712	2026-04-27 19:45:19.924	CASH	MONTHS	0	0	500000	\N
287	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.299	2026-06-20 14:56:56.299	\N	\N	\N	\N	0	\N
259	116	15	7	1	\N	SALE	\N	PENDING	0	1500000	1500000	\N	PICKUP	\N		0	0	1500000	\N	\N	0	\N	2026-04-27 19:20:03.308	2026-04-27 19:45:54.136	CASH	MONTHS	0	0	500000	\N
288	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.302	2026-06-20 14:56:56.302	\N	\N	\N	\N	0	\N
255	112	15	7	1	\N	SALE	\N	PENDING	0	4500000	4500000	CASH	PICKUP	\N		0	0	4500000	\N	\N	3000000	2026-06-19 14:06:00.924	2026-04-24 18:13:48.604	2026-06-19 14:06:00.944	CASH	MONTHS	0	0	1500000	\N
274	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.247	2026-06-20 14:56:56.247	\N	\N	\N	\N	0	\N
275	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.255	2026-06-20 14:56:56.255	\N	\N	\N	\N	0	\N
276	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.259	2026-06-20 14:56:56.259	\N	\N	\N	\N	0	\N
277	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.263	2026-06-20 14:56:56.263	\N	\N	\N	\N	0	\N
278	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.267	2026-06-20 14:56:56.267	\N	\N	\N	\N	0	\N
279	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.271	2026-06-20 14:56:56.271	\N	\N	\N	\N	0	\N
280	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.274	2026-06-20 14:56:56.274	\N	\N	\N	\N	0	\N
281	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.278	2026-06-20 14:56:56.278	\N	\N	\N	\N	0	\N
289	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.306	2026-06-20 14:56:56.306	\N	\N	\N	\N	0	\N
290	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.309	2026-06-20 14:56:56.309	\N	\N	\N	\N	0	\N
291	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.313	2026-06-20 14:56:56.313	\N	\N	\N	\N	0	\N
292	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.316	2026-06-20 14:56:56.316	\N	\N	\N	\N	0	\N
293	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.32	2026-06-20 14:56:56.32	\N	\N	\N	\N	0	\N
294	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.323	2026-06-20 14:56:56.323	\N	\N	\N	\N	0	\N
295	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.327	2026-06-20 14:56:56.327	\N	\N	\N	\N	0	\N
296	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.33	2026-06-20 14:56:56.33	\N	\N	\N	\N	0	\N
297	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.334	2026-06-20 14:56:56.334	\N	\N	\N	\N	0	\N
298	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.34	2026-06-20 14:56:56.34	\N	\N	\N	\N	0	\N
299	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.349	2026-06-20 14:56:56.349	\N	\N	\N	\N	0	\N
300	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.353	2026-06-20 14:56:56.353	\N	\N	\N	\N	0	\N
301	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.357	2026-06-20 14:56:56.357	\N	\N	\N	\N	0	\N
302	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.36	2026-06-20 14:56:56.36	\N	\N	\N	\N	0	\N
303	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.364	2026-06-20 14:56:56.364	\N	\N	\N	\N	0	\N
304	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.367	2026-06-20 14:56:56.367	\N	\N	\N	\N	0	\N
305	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.371	2026-06-20 14:56:56.371	\N	\N	\N	\N	0	\N
306	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.374	2026-06-20 14:56:56.374	\N	\N	\N	\N	0	\N
307	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.378	2026-06-20 14:56:56.378	\N	\N	\N	\N	0	\N
308	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.382	2026-06-20 14:56:56.382	\N	\N	\N	\N	0	\N
309	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.385	2026-06-20 14:56:56.385	\N	\N	\N	\N	0	\N
310	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.389	2026-06-20 14:56:56.389	\N	\N	\N	\N	0	\N
311	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.393	2026-06-20 14:56:56.393	\N	\N	\N	\N	0	\N
312	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.396	2026-06-20 14:56:56.396	\N	\N	\N	\N	0	\N
313	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.4	2026-06-20 14:56:56.4	\N	\N	\N	\N	0	\N
314	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.403	2026-06-20 14:56:56.403	\N	\N	\N	\N	0	\N
315	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.407	2026-06-20 14:56:56.407	\N	\N	\N	\N	0	\N
316	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.411	2026-06-20 14:56:56.411	\N	\N	\N	\N	0	\N
317	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.415	2026-06-20 14:56:56.415	\N	\N	\N	\N	0	\N
318	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.418	2026-06-20 14:56:56.418	\N	\N	\N	\N	0	\N
319	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.421	2026-06-20 14:56:56.421	\N	\N	\N	\N	0	\N
320	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.424	2026-06-20 14:56:56.424	\N	\N	\N	\N	0	\N
321	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.427	2026-06-20 14:56:56.427	\N	\N	\N	\N	0	\N
322	\N	\N	\N	\N	\N	PURCHASE	\N	COMPLETED	0	0	0	\N	\N	\N	\N	0	\N	0	\N	Initial stock for product creation	0	\N	2026-06-20 14:56:56.431	2026-06-20 14:56:56.431	\N	\N	\N	\N	0	\N
323	\N	8	8	4	2	TRANSFER	\N	PENDING	0	1690000	1690000	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	\N	2026-06-23 11:27:56.561	2026-06-23 11:27:56.561	\N	\N	\N	\N	0	\N
272	118	15	19	1	\N	SALE	\N	PENDING	0	4500000	4500000	CASH	PICKUP	\N		0	0	4500000	\N	\N	0	\N	2026-06-18 14:14:36.785	2026-06-23 11:32:53.957	CASH	MONTHS	0	0	750000	\N
324	119	15	19	1	\N	SALE	\N	PENDING	0	3900000	3900000	CASH	DELIVERY	\N	Dostlik	0	0	3900000	\N	\N	0	\N	2026-06-23 12:39:25.277	2026-06-23 14:18:52.586	CASH	MONTHS	0	0	650000	\N
\.


--
-- Data for Name: TransactionBonusProduct; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransactionBonusProduct" (id, "transactionId", "productId", quantity, "createdAt", "updatedAt") FROM stdin;
24	124	12	1	2026-04-06 18:10:47.654	2026-04-06 18:10:47.654
\.


--
-- Data for Name: TransactionItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransactionItem" (id, "transactionId", "productId", quantity, price, total, "creditMonth", "creditPercent", "monthlyPayment", "createdAt", "updatedAt", "originalPrice", "sellingPrice", status) FROM stdin;
126	127	12	5	150000	750000	\N	\N	\N	2026-04-09 14:40:24.142	2026-04-09 14:40:24.142	150000	150000	\N
127	128	12	1	150000	150000	\N	\N	\N	2026-04-09 20:10:12.713	2026-04-09 20:10:12.713	150000	150000	\N
128	129	12	1	150000	150000	\N	\N	\N	2026-04-09 20:10:21.232	2026-04-09 20:10:21.232	150000	150000	\N
129	130	12	1	150000	150000	\N	\N	\N	2026-04-09 20:10:30.946	2026-04-09 20:10:30.946	150000	150000	\N
91	92	6	0	3440000	0	\N	\N	0	2025-11-28 09:40:11.104	2025-11-28 09:40:26.933	3440000	3440000	RETURNED
130	131	12	1	150000	150000	\N	\N	\N	2026-04-09 20:10:37.744	2026-04-09 20:10:37.744	150000	150000	\N
131	132	12	1	150000	150000	\N	\N	\N	2026-04-09 20:11:10.327	2026-04-09 20:11:10.327	150000	150000	\N
132	133	12	1	150000	150000	\N	\N	\N	2026-04-09 20:11:14.859	2026-04-09 20:11:14.859	150000	150000	\N
133	134	12	1	150000	150000	\N	\N	\N	2026-04-09 20:11:20.226	2026-04-09 20:11:20.226	150000	150000	\N
134	135	12	1	150000	150000	\N	\N	\N	2026-04-09 20:11:25.009	2026-04-09 20:11:25.009	150000	150000	\N
135	136	12	1	150000	150000	\N	\N	\N	2026-04-09 20:11:28.875	2026-04-09 20:11:28.875	150000	150000	\N
101	102	6	10	3440000	34400000	\N	\N	\N	2025-11-30 18:46:27.39	2025-11-30 18:46:27.39	3440000	3440000	\N
89	90	\N	0	200000	0	\N	\N	0	2025-11-23 14:29:56.601	2025-11-23 14:30:12.459	200000	200000	RETURNED
90	91	\N	1	200000	200000	\N	\N	0	2025-11-23 15:08:33.729	2025-11-23 15:08:33.729	200000	200000	\N
92	93	\N	0	200000	0	\N	\N	0	2025-11-28 10:42:56.099	2025-11-28 10:43:14.678	200000	200000	RETURNED
93	94	\N	0	200000	0	\N	\N	0	2025-11-28 10:49:08.56	2025-11-28 10:49:22.906	200000	200000	RETURNED
94	95	\N	1	200000	200000	\N	\N	0	2025-11-28 10:49:48.589	2025-11-28 10:49:48.589	200000	200000	\N
95	96	\N	0	200000	0	\N	\N	0	2025-11-28 10:50:06.446	2025-11-28 18:03:53.555	200000	200000	RETURNED
96	97	\N	0	200000	0	\N	\N	0	2025-11-28 18:05:01.288	2025-11-28 18:05:14.691	200000	200000	RETURNED
97	98	\N	0	200000	0	\N	\N	0	2025-11-28 18:05:35.915	2025-11-28 18:05:52.48	200000	200000	RETURNED
98	99	\N	0	200000	0	\N	\N	0	2025-11-28 18:06:18.715	2025-11-28 18:06:35.195	200000	200000	RETURNED
99	100	\N	10	200000	2000000	\N	\N	\N	2025-11-30 18:45:04.923	2025-11-30 18:45:04.923	200000	200000	\N
100	101	\N	5	200000	1000000	\N	\N	\N	2025-11-30 18:46:03.006	2025-11-30 18:46:03.006	200000	200000	\N
102	103	\N	2	200000	400000	\N	\N	0	2026-01-30 17:51:02.789	2026-01-30 17:51:02.789	200000	200000	\N
103	104	6	1	3440000	3440000	\N	\N	0	2026-01-30 17:58:51.879	2026-01-30 17:58:51.879	3440000	3440000	\N
104	105	2	1	1000000	1000000	\N	\N	0	2026-02-12 20:03:23.787	2026-02-12 20:03:23.787	1000000	1000000	\N
105	106	2	1	1000000	1000000	\N	\N	0	2026-02-13 18:35:48.064	2026-02-13 18:35:48.064	1000000	1000000	\N
106	107	2	1	1000000	1000000	6	0.2	200000	2026-02-13 18:39:17.023	2026-02-13 18:39:17.023	1000000	1000000	\N
107	108	2	1	1000000	1000000	\N	\N	0	2026-02-13 18:42:37.057	2026-02-13 18:42:37.057	1000000	1000000	\N
108	109	2	1	1000000	1000000	\N	\N	0	2026-02-13 18:53:12.061	2026-02-13 18:53:12.061	1000000	1000000	\N
109	110	2	1	1000000	1000000	\N	\N	0	2026-02-13 19:20:01.26	2026-02-13 19:20:01.26	1000000	1000000	\N
110	111	2	1	1000000	1000000	\N	\N	0	2026-02-13 19:25:33.906	2026-02-13 19:25:33.906	1000000	1000000	\N
111	112	2	10	1000000	10000000	\N	\N	\N	2026-03-14 20:36:58.988	2026-03-14 20:36:58.988	1000000	1000000	\N
112	113	2	10	1000000	10000000	\N	\N	\N	2026-03-14 20:37:47.035	2026-03-14 20:37:47.035	1000000	1000000	\N
113	114	2	100	1000000	100000000	\N	\N	\N	2026-03-14 20:48:50.303	2026-03-14 20:48:50.303	1000000	1000000	\N
114	115	2	0	1000000	0	\N	\N	0	2026-03-14 20:52:16.261	2026-03-14 20:54:18.576	1000000	1000000	RETURNED
115	116	12	100	0	0	\N	\N	\N	2026-03-19 19:30:08.142	2026-03-19 19:30:08.142	\N	\N	\N
116	117	12	1	150000	150000	\N	\N	\N	2026-03-19 19:31:00.14	2026-03-19 19:31:00.14	150000	150000	\N
117	118	12	1	150000	150000	\N	\N	\N	2026-03-19 19:38:17.737	2026-03-19 19:38:17.737	150000	150000	\N
118	119	12	5	150000	750000	\N	\N	\N	2026-03-19 19:40:11.319	2026-03-19 19:40:11.319	150000	150000	\N
119	120	12	3	150000	450000	\N	\N	\N	2026-03-19 19:57:08.332	2026-03-19 19:57:08.332	150000	150000	\N
120	121	12	3	150000	450000	\N	\N	\N	2026-03-19 20:04:19.068	2026-03-19 20:04:19.068	150000	150000	\N
121	122	12	1	150000	150000	\N	\N	\N	2026-03-19 20:11:15.244	2026-03-19 20:11:15.244	150000	150000	\N
122	123	12	10	150000	1500000	\N	\N	\N	2026-03-19 20:23:44.479	2026-03-19 20:23:44.479	150000	150000	\N
123	124	2	1	2000000	2000000	\N	\N	0	2026-04-06 18:10:47.624	2026-04-06 18:10:47.624	1000000	2000000	\N
124	125	2	1	1000000	1000000	\N	\N	0	2026-04-06 18:13:59.982	2026-04-06 18:13:59.982	1000000	1000000	\N
125	126	12	1	150000	150000	\N	\N	0	2026-04-06 18:41:00.716	2026-04-06 18:41:00.716	150000	150000	\N
136	137	12	1	150000	150000	\N	\N	\N	2026-04-09 20:13:18.536	2026-04-09 20:13:18.536	150000	150000	\N
137	138	12	1	150000	150000	\N	\N	\N	2026-04-09 20:13:23.575	2026-04-09 20:13:23.575	150000	150000	\N
138	139	12	1	150000	150000	\N	\N	\N	2026-04-09 20:13:28.156	2026-04-09 20:13:28.156	150000	150000	\N
139	140	12	1	150000	150000	\N	\N	\N	2026-04-09 20:13:32.489	2026-04-09 20:13:32.489	150000	150000	\N
140	141	12	1	150000	150000	\N	\N	\N	2026-04-09 20:13:37.438	2026-04-09 20:13:37.438	150000	150000	\N
141	142	15	124	0	0	\N	\N	\N	2026-04-15 10:04:26.279	2026-04-15 10:04:26.279	\N	\N	\N
142	143	15	10	1240000	12400000	\N	\N	\N	2026-04-15 10:08:45.885	2026-04-15 10:08:45.885	1240000	1240000	\N
143	144	17	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.522	2026-04-15 14:47:48.522	\N	\N	\N
144	145	18	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.528	2026-04-15 14:47:48.528	\N	\N	\N
145	146	19	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.533	2026-04-15 14:47:48.533	\N	\N	\N
146	147	20	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.537	2026-04-15 14:47:48.537	\N	\N	\N
147	148	21	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.541	2026-04-15 14:47:48.541	\N	\N	\N
148	149	22	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.545	2026-04-15 14:47:48.545	\N	\N	\N
149	150	23	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.549	2026-04-15 14:47:48.549	\N	\N	\N
150	151	24	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.553	2026-04-15 14:47:48.553	\N	\N	\N
151	152	25	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.557	2026-04-15 14:47:48.557	\N	\N	\N
152	153	26	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.56	2026-04-15 14:47:48.56	\N	\N	\N
153	154	27	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.564	2026-04-15 14:47:48.564	\N	\N	\N
154	155	28	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.567	2026-04-15 14:47:48.567	\N	\N	\N
155	156	29	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.571	2026-04-15 14:47:48.571	\N	\N	\N
156	157	30	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.575	2026-04-15 14:47:48.575	\N	\N	\N
157	158	31	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.579	2026-04-15 14:47:48.579	\N	\N	\N
158	159	32	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.582	2026-04-15 14:47:48.582	\N	\N	\N
159	160	33	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.586	2026-04-15 14:47:48.586	\N	\N	\N
160	161	34	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.59	2026-04-15 14:47:48.59	\N	\N	\N
161	162	35	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.593	2026-04-15 14:47:48.593	\N	\N	\N
162	163	36	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.597	2026-04-15 14:47:48.597	\N	\N	\N
163	164	37	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.6	2026-04-15 14:47:48.6	\N	\N	\N
164	165	38	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.604	2026-04-15 14:47:48.604	\N	\N	\N
165	166	39	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.608	2026-04-15 14:47:48.608	\N	\N	\N
166	167	40	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.611	2026-04-15 14:47:48.611	\N	\N	\N
167	168	41	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.616	2026-04-15 14:47:48.616	\N	\N	\N
168	169	42	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.621	2026-04-15 14:47:48.621	\N	\N	\N
169	170	43	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.629	2026-04-15 14:47:48.629	\N	\N	\N
170	171	44	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.633	2026-04-15 14:47:48.633	\N	\N	\N
171	172	45	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.636	2026-04-15 14:47:48.636	\N	\N	\N
172	173	46	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.642	2026-04-15 14:47:48.642	\N	\N	\N
173	174	47	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.645	2026-04-15 14:47:48.645	\N	\N	\N
174	175	48	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.649	2026-04-15 14:47:48.649	\N	\N	\N
175	176	49	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.652	2026-04-15 14:47:48.652	\N	\N	\N
176	177	50	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.656	2026-04-15 14:47:48.656	\N	\N	\N
177	178	51	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.66	2026-04-15 14:47:48.66	\N	\N	\N
178	179	52	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.663	2026-04-15 14:47:48.663	\N	\N	\N
179	180	53	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.666	2026-04-15 14:47:48.666	\N	\N	\N
180	181	54	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.67	2026-04-15 14:47:48.67	\N	\N	\N
181	182	55	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.674	2026-04-15 14:47:48.674	\N	\N	\N
182	183	56	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.678	2026-04-15 14:47:48.678	\N	\N	\N
183	184	57	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.681	2026-04-15 14:47:48.681	\N	\N	\N
184	185	58	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.684	2026-04-15 14:47:48.684	\N	\N	\N
185	186	59	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.688	2026-04-15 14:47:48.688	\N	\N	\N
186	187	60	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.692	2026-04-15 14:47:48.692	\N	\N	\N
187	188	61	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.695	2026-04-15 14:47:48.695	\N	\N	\N
188	189	62	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.699	2026-04-15 14:47:48.699	\N	\N	\N
189	190	63	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.702	2026-04-15 14:47:48.702	\N	\N	\N
190	191	64	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.706	2026-04-15 14:47:48.706	\N	\N	\N
191	192	65	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.709	2026-04-15 14:47:48.709	\N	\N	\N
192	193	66	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.713	2026-04-15 14:47:48.713	\N	\N	\N
193	194	67	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.716	2026-04-15 14:47:48.716	\N	\N	\N
194	195	68	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.72	2026-04-15 14:47:48.72	\N	\N	\N
195	196	69	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.723	2026-04-15 14:47:48.723	\N	\N	\N
196	197	70	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.727	2026-04-15 14:47:48.727	\N	\N	\N
197	198	71	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.73	2026-04-15 14:47:48.73	\N	\N	\N
198	199	72	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.734	2026-04-15 14:47:48.734	\N	\N	\N
199	200	73	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.737	2026-04-15 14:47:48.737	\N	\N	\N
200	201	74	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.741	2026-04-15 14:47:48.741	\N	\N	\N
201	202	75	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.745	2026-04-15 14:47:48.745	\N	\N	\N
202	203	76	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.748	2026-04-15 14:47:48.748	\N	\N	\N
203	204	77	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.751	2026-04-15 14:47:48.751	\N	\N	\N
204	205	78	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.755	2026-04-15 14:47:48.755	\N	\N	\N
205	206	79	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.759	2026-04-15 14:47:48.759	\N	\N	\N
206	207	80	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.762	2026-04-15 14:47:48.762	\N	\N	\N
207	208	81	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.766	2026-04-15 14:47:48.766	\N	\N	\N
208	209	82	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.769	2026-04-15 14:47:48.769	\N	\N	\N
209	210	83	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.773	2026-04-15 14:47:48.773	\N	\N	\N
210	211	84	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.779	2026-04-15 14:47:48.779	\N	\N	\N
211	212	85	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.783	2026-04-15 14:47:48.783	\N	\N	\N
212	213	86	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.786	2026-04-15 14:47:48.786	\N	\N	\N
213	214	87	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.79	2026-04-15 14:47:48.79	\N	\N	\N
214	215	88	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.793	2026-04-15 14:47:48.793	\N	\N	\N
215	216	89	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.797	2026-04-15 14:47:48.797	\N	\N	\N
216	217	90	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.8	2026-04-15 14:47:48.8	\N	\N	\N
217	218	91	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.804	2026-04-15 14:47:48.804	\N	\N	\N
218	219	92	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.807	2026-04-15 14:47:48.807	\N	\N	\N
219	220	93	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.811	2026-04-15 14:47:48.811	\N	\N	\N
220	221	94	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.814	2026-04-15 14:47:48.814	\N	\N	\N
221	222	95	1000	0	0	\N	\N	\N	2026-04-15 14:47:48.818	2026-04-15 14:47:48.818	\N	\N	\N
222	223	17	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
223	223	26	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
224	223	27	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
225	223	28	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
226	223	29	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
227	223	30	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
228	223	31	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
229	223	32	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
230	223	33	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
231	223	34	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
232	223	35	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
233	223	18	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
234	223	36	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
235	223	37	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
236	223	38	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
237	223	39	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
238	223	40	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
239	223	41	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
240	223	42	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
241	223	43	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
242	223	44	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
243	223	45	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
244	223	19	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
245	223	46	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
246	223	47	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
247	223	49	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
248	223	48	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
249	223	50	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
250	223	51	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
251	223	52	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
252	223	53	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
253	223	54	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
254	223	55	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
255	223	20	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
256	223	56	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
257	223	57	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
258	223	58	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
259	223	59	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
260	223	60	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
261	223	61	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
262	223	62	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
263	223	63	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
264	223	64	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
265	223	65	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
266	223	66	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
267	223	21	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
268	223	67	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
269	223	68	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
270	223	69	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
271	223	70	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
272	223	71	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
273	223	72	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
274	223	73	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
275	223	74	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
276	223	75	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
277	223	22	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
278	223	76	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
279	223	77	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
280	223	78	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
281	223	79	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
282	223	80	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
283	223	81	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
284	223	82	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
285	223	83	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
286	223	84	1	1500000	1500000	\N	\N	\N	2026-04-15 14:49:55.555	2026-04-15 14:49:55.555	1500000	1500000	\N
287	224	17	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
288	224	26	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
289	224	27	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
290	224	28	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
291	224	29	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
292	224	30	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
293	224	31	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
294	224	32	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
295	224	33	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
296	224	34	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
297	224	35	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
298	224	18	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
299	224	36	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
300	224	37	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
301	224	38	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
302	224	39	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
303	224	40	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
304	224	41	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
305	224	42	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
306	224	43	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
307	224	44	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
308	224	45	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
309	224	19	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
310	224	46	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
311	224	47	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
312	224	48	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
313	224	49	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
314	224	50	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
315	224	51	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
316	224	52	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
317	224	53	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
318	224	54	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
319	224	55	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
320	224	20	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
321	224	56	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
322	224	57	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
323	224	58	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
324	224	59	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
325	224	60	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
326	224	61	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
327	224	62	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
328	224	63	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
329	224	64	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
330	224	65	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
331	224	21	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
332	224	66	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
333	224	67	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
334	224	68	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
335	224	69	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
336	224	70	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
337	224	71	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
338	224	72	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
339	224	73	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
340	224	74	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
341	224	75	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
342	224	22	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
343	224	76	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
344	224	77	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
345	224	78	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
346	224	79	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
347	224	80	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
348	224	81	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
349	224	82	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
350	224	83	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
351	224	84	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
352	224	85	1	1500000	1500000	\N	\N	\N	2026-04-15 14:52:27.472	2026-04-15 14:52:27.472	1500000	1500000	\N
353	225	17	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
354	225	26	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
355	225	27	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
356	225	28	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
357	225	29	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
358	225	30	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
359	225	31	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
360	225	32	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
361	225	33	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
362	225	34	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
363	225	35	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
364	225	18	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
365	225	36	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
366	225	37	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
367	225	38	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
368	225	39	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
369	225	40	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
370	225	41	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
371	225	42	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
372	225	43	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
373	225	44	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
374	225	45	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
375	225	19	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
376	225	46	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
377	225	47	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
378	225	48	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
379	225	49	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
380	225	50	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
381	225	51	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
382	225	52	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
383	225	53	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
384	225	54	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
385	225	55	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
386	225	20	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
387	225	56	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
388	225	57	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
389	225	58	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
390	225	59	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
391	225	60	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
392	225	61	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
393	225	62	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
394	225	63	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
395	225	64	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
396	225	65	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
397	225	21	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
398	225	66	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
399	225	67	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
400	225	68	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
401	225	69	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
402	225	70	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
403	225	71	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
404	225	72	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
405	225	73	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
406	225	74	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
407	225	75	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
408	225	22	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
409	225	76	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
410	225	77	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
411	225	78	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
412	225	79	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
413	225	80	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
414	225	81	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
415	225	82	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
416	225	83	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
417	225	84	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
418	225	85	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
419	225	23	10	1500000	15000000	\N	\N	\N	2026-04-15 14:57:29.773	2026-04-15 14:57:29.773	1500000	1500000	\N
420	226	96	1	1500000	1500000	\N	\N	0	2026-04-20 15:27:16.985	2026-04-20 15:27:16.985	1500000	1500000	\N
421	227	96	1	1500000	1500000	\N	\N	0	2026-04-20 15:49:08.121	2026-04-20 15:49:08.121	1500000	1500000	\N
422	228	96	1	1500000	1500000	\N	\N	0	2026-04-20 15:56:02.104	2026-04-20 15:56:02.104	1500000	1500000	\N
423	229	96	1	1500000	1500000	\N	\N	0	2026-04-20 16:00:25.145	2026-04-20 16:00:25.145	1500000	1500000	\N
424	230	96	1	1500000	1500000	\N	\N	0	2026-04-21 14:03:55.192	2026-04-21 14:03:55.192	1500000	1500000	\N
425	231	96	1	1500000	1500000	\N	\N	0	2026-04-21 15:33:05.691	2026-04-21 15:33:05.691	1500000	1500000	\N
426	232	96	1	1500000	1500000	\N	\N	0	2026-04-21 15:35:29.4	2026-04-21 15:35:29.4	1500000	1500000	\N
427	233	96	1	1500000	1500000	\N	\N	0	2026-04-21 15:36:24.916	2026-04-21 15:36:24.916	1500000	1500000	\N
428	234	96	1	1500000	1500000	\N	\N	0	2026-04-21 15:48:03.74	2026-04-21 15:48:03.74	1500000	1500000	\N
429	235	96	1	1500000	1500000	\N	\N	0	2026-04-21 15:52:43.853	2026-04-21 15:52:43.853	1500000	1500000	\N
430	236	96	1	1500000	1500000	\N	\N	0	2026-04-21 15:58:18.606	2026-04-21 15:58:18.606	1500000	1500000	\N
431	237	97	1	1500000	1500000	\N	\N	0	2026-04-21 16:28:52.133	2026-04-21 16:28:52.133	1500000	1500000	\N
432	238	97	1	1500000	1500000	\N	\N	0	2026-04-21 16:32:02.668	2026-04-21 16:32:02.668	1500000	1500000	\N
433	239	97	1	1500000	1500000	\N	\N	0	2026-04-22 15:07:49.817	2026-04-22 15:07:49.817	1500000	1500000	\N
434	240	97	1	1500000	1500000	\N	\N	0	2026-04-22 15:09:03.121	2026-04-22 15:09:03.121	1500000	1500000	\N
435	241	97	1	1500000	1500000	4	0.1	412500	2026-04-22 15:10:44.796	2026-04-22 15:10:44.796	1500000	1500000	\N
436	242	97	1	1500000	1500000	\N	\N	0	2026-04-23 16:01:53.428	2026-04-23 16:01:53.428	1500000	1500000	\N
437	243	97	1	1500000	1500000	\N	\N	0	2026-04-23 16:03:53.488	2026-04-23 16:03:53.488	1500000	1500000	\N
448	254	97	1	1500000	1500000	\N	\N	0	2026-04-24 18:11:57.745	2026-04-24 18:11:57.745	1500000	1500000	\N
449	255	97	1	1500000	1500000	\N	\N	0	2026-04-24 18:13:48.604	2026-04-24 18:13:48.604	1500000	1500000	\N
450	255	98	1	1500000	1500000	\N	\N	0	2026-04-24 18:13:48.604	2026-04-24 18:13:48.604	1500000	1500000	\N
451	255	99	1	1500000	1500000	\N	\N	0	2026-04-24 18:13:48.604	2026-04-24 18:13:48.604	1500000	1500000	\N
452	256	97	1	1500000	1500000	\N	\N	0	2026-04-25 19:59:20.098	2026-04-25 19:59:20.098	1500000	1500000	\N
453	257	97	1	1500000	1500000	\N	\N	0	2026-04-25 20:03:28.024	2026-04-25 20:03:28.024	1500000	1500000	\N
454	258	98	1	1500000	1500000	\N	\N	0	2026-04-27 19:17:47.554	2026-04-27 19:17:47.554	1500000	1500000	\N
455	259	98	1	1500000	1500000	\N	\N	0	2026-04-27 19:20:03.308	2026-04-27 19:20:03.308	1500000	1500000	\N
456	260	98	1	1500000	1500000	\N	\N	0	2026-04-27 19:41:48.712	2026-04-27 19:41:48.712	1500000	1500000	\N
457	261	98	1	1500000	1500000	\N	\N	0	2026-05-13 17:59:38.378	2026-05-13 17:59:38.378	1500000	1500000	\N
458	262	229	100	0	0	\N	\N	\N	2026-05-22 09:30:06.673	2026-05-22 09:30:06.673	\N	\N	\N
459	263	229	1	1300000	1300000	\N	\N	\N	2026-05-22 09:32:47.94	2026-05-22 09:32:47.94	1300000	1300000	\N
460	263	17	1	1500000	1500000	\N	\N	\N	2026-05-22 09:32:47.94	2026-05-22 09:32:47.94	1500000	1500000	\N
461	264	231	1000	0	0	\N	\N	\N	2026-05-26 21:03:27.115	2026-05-26 21:03:27.115	\N	\N	\N
462	265	231	12	100	1200	\N	\N	0	2026-05-26 21:03:43.206	2026-05-26 21:03:43.206	100	100	\N
463	266	231	1	12000000	12000000	\N	\N	\N	2026-05-26 21:04:04.062	2026-05-26 21:04:04.062	12000000	12000000	\N
464	267	231	1	12000000	12000000	\N	\N	\N	2026-05-26 21:10:48.622	2026-05-26 21:10:48.622	12000000	12000000	\N
466	270	237	100	0	0	\N	\N	\N	2026-05-26 21:13:09.131	2026-05-26 21:13:09.131	\N	\N	\N
467	271	238	100	0	0	\N	\N	\N	2026-05-26 21:13:39.73	2026-05-26 21:13:39.73	\N	\N	\N
469	272	99	1	1500000	1500000	\N	\N	0	2026-06-18 14:14:36.785	2026-06-18 14:14:36.785	1500000	1500000	\N
470	272	100	1	1500000	1500000	\N	\N	0	2026-06-18 14:14:36.785	2026-06-18 14:14:36.785	1500000	1500000	\N
471	273	229	1	1300000	1300000	\N	\N	\N	2026-06-19 11:42:35.409	2026-06-19 11:42:35.409	1300000	1300000	\N
472	273	231	1	12000000	12000000	\N	\N	\N	2026-06-19 11:42:35.409	2026-06-19 11:42:35.409	12000000	12000000	\N
473	273	237	1	100000	100000	\N	\N	\N	2026-06-19 11:42:35.409	2026-06-19 11:42:35.409	100000	100000	\N
474	274	468	59	0	0	\N	\N	\N	2026-06-20 14:56:56.25	2026-06-20 14:56:56.25	\N	\N	\N
475	275	469	2	0	0	\N	\N	\N	2026-06-20 14:56:56.256	2026-06-20 14:56:56.256	\N	\N	\N
476	276	470	15	0	0	\N	\N	\N	2026-06-20 14:56:56.26	2026-06-20 14:56:56.26	\N	\N	\N
477	277	471	10	0	0	\N	\N	\N	2026-06-20 14:56:56.264	2026-06-20 14:56:56.264	\N	\N	\N
478	278	472	10	0	0	\N	\N	\N	2026-06-20 14:56:56.268	2026-06-20 14:56:56.268	\N	\N	\N
479	279	473	10	0	0	\N	\N	\N	2026-06-20 14:56:56.272	2026-06-20 14:56:56.272	\N	\N	\N
480	280	474	10	0	0	\N	\N	\N	2026-06-20 14:56:56.275	2026-06-20 14:56:56.275	\N	\N	\N
481	281	475	10	0	0	\N	\N	\N	2026-06-20 14:56:56.279	2026-06-20 14:56:56.279	\N	\N	\N
482	282	476	10	0	0	\N	\N	\N	2026-06-20 14:56:56.282	2026-06-20 14:56:56.282	\N	\N	\N
483	283	477	10	0	0	\N	\N	\N	2026-06-20 14:56:56.286	2026-06-20 14:56:56.286	\N	\N	\N
484	284	478	10	0	0	\N	\N	\N	2026-06-20 14:56:56.289	2026-06-20 14:56:56.289	\N	\N	\N
485	285	479	10	0	0	\N	\N	\N	2026-06-20 14:56:56.292	2026-06-20 14:56:56.292	\N	\N	\N
486	286	480	10	0	0	\N	\N	\N	2026-06-20 14:56:56.296	2026-06-20 14:56:56.296	\N	\N	\N
487	287	481	10	0	0	\N	\N	\N	2026-06-20 14:56:56.299	2026-06-20 14:56:56.299	\N	\N	\N
488	288	482	10	0	0	\N	\N	\N	2026-06-20 14:56:56.303	2026-06-20 14:56:56.303	\N	\N	\N
489	289	483	10	0	0	\N	\N	\N	2026-06-20 14:56:56.306	2026-06-20 14:56:56.306	\N	\N	\N
490	290	484	10	0	0	\N	\N	\N	2026-06-20 14:56:56.31	2026-06-20 14:56:56.31	\N	\N	\N
491	291	485	10	0	0	\N	\N	\N	2026-06-20 14:56:56.314	2026-06-20 14:56:56.314	\N	\N	\N
492	292	486	10	0	0	\N	\N	\N	2026-06-20 14:56:56.317	2026-06-20 14:56:56.317	\N	\N	\N
493	293	487	10	0	0	\N	\N	\N	2026-06-20 14:56:56.321	2026-06-20 14:56:56.321	\N	\N	\N
494	294	488	10	0	0	\N	\N	\N	2026-06-20 14:56:56.324	2026-06-20 14:56:56.324	\N	\N	\N
495	295	489	10	0	0	\N	\N	\N	2026-06-20 14:56:56.327	2026-06-20 14:56:56.327	\N	\N	\N
496	296	490	10	0	0	\N	\N	\N	2026-06-20 14:56:56.331	2026-06-20 14:56:56.331	\N	\N	\N
497	297	491	10	0	0	\N	\N	\N	2026-06-20 14:56:56.336	2026-06-20 14:56:56.336	\N	\N	\N
498	298	492	10	0	0	\N	\N	\N	2026-06-20 14:56:56.342	2026-06-20 14:56:56.342	\N	\N	\N
499	299	493	10	0	0	\N	\N	\N	2026-06-20 14:56:56.35	2026-06-20 14:56:56.35	\N	\N	\N
500	300	494	10	0	0	\N	\N	\N	2026-06-20 14:56:56.354	2026-06-20 14:56:56.354	\N	\N	\N
501	301	495	10	0	0	\N	\N	\N	2026-06-20 14:56:56.358	2026-06-20 14:56:56.358	\N	\N	\N
502	302	496	10	0	0	\N	\N	\N	2026-06-20 14:56:56.361	2026-06-20 14:56:56.361	\N	\N	\N
503	303	497	10	0	0	\N	\N	\N	2026-06-20 14:56:56.365	2026-06-20 14:56:56.365	\N	\N	\N
504	304	498	10	0	0	\N	\N	\N	2026-06-20 14:56:56.368	2026-06-20 14:56:56.368	\N	\N	\N
505	305	499	10	0	0	\N	\N	\N	2026-06-20 14:56:56.371	2026-06-20 14:56:56.371	\N	\N	\N
468	272	98	0	1500000	0	\N	\N	0	2026-06-18 14:14:36.785	2026-06-23 11:32:53.952	1500000	1500000	RETURNED
506	306	500	10	0	0	\N	\N	\N	2026-06-20 14:56:56.375	2026-06-20 14:56:56.375	\N	\N	\N
507	307	501	10	0	0	\N	\N	\N	2026-06-20 14:56:56.379	2026-06-20 14:56:56.379	\N	\N	\N
508	308	502	10	0	0	\N	\N	\N	2026-06-20 14:56:56.382	2026-06-20 14:56:56.382	\N	\N	\N
509	309	503	10	0	0	\N	\N	\N	2026-06-20 14:56:56.386	2026-06-20 14:56:56.386	\N	\N	\N
510	310	504	10	0	0	\N	\N	\N	2026-06-20 14:56:56.39	2026-06-20 14:56:56.39	\N	\N	\N
511	311	505	10	0	0	\N	\N	\N	2026-06-20 14:56:56.393	2026-06-20 14:56:56.393	\N	\N	\N
512	312	506	10	0	0	\N	\N	\N	2026-06-20 14:56:56.397	2026-06-20 14:56:56.397	\N	\N	\N
513	313	507	10	0	0	\N	\N	\N	2026-06-20 14:56:56.401	2026-06-20 14:56:56.401	\N	\N	\N
514	314	508	10	0	0	\N	\N	\N	2026-06-20 14:56:56.404	2026-06-20 14:56:56.404	\N	\N	\N
515	315	509	10	0	0	\N	\N	\N	2026-06-20 14:56:56.407	2026-06-20 14:56:56.407	\N	\N	\N
516	316	510	10	0	0	\N	\N	\N	2026-06-20 14:56:56.411	2026-06-20 14:56:56.411	\N	\N	\N
517	317	511	10	0	0	\N	\N	\N	2026-06-20 14:56:56.415	2026-06-20 14:56:56.415	\N	\N	\N
518	318	512	10	0	0	\N	\N	\N	2026-06-20 14:56:56.418	2026-06-20 14:56:56.418	\N	\N	\N
519	319	513	10	0	0	\N	\N	\N	2026-06-20 14:56:56.421	2026-06-20 14:56:56.421	\N	\N	\N
520	320	514	10	0	0	\N	\N	\N	2026-06-20 14:56:56.424	2026-06-20 14:56:56.424	\N	\N	\N
521	321	515	10	0	0	\N	\N	\N	2026-06-20 14:56:56.428	2026-06-20 14:56:56.428	\N	\N	\N
522	322	516	10	0	0	\N	\N	\N	2026-06-20 14:56:56.431	2026-06-20 14:56:56.431	\N	\N	\N
523	323	229	1	1690000	1690000	\N	\N	\N	2026-06-23 11:27:56.561	2026-06-23 11:27:56.561	1690000	1690000	\N
525	324	99	1	1950000	1950000	\N	\N	0	2026-06-23 12:39:25.277	2026-06-23 12:39:25.277	1950000	1950000	\N
524	324	98	0	1950000	0	\N	\N	0	2026-06-23 12:39:25.277	2026-06-23 14:18:52.579	1950000	1950000	RETURNED
\.


--
-- Data for Name: TransactionPayment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TransactionPayment" (id, "transactionId", method, amount, "createdAt") FROM stdin;
3	90	CARD	100000	2025-11-23 14:29:56.601
4	90	TERMINAL	100000	2025-11-23 14:29:56.601
5	91	TOVAR	100000	2025-11-23 15:08:33.729
6	91	CASH	100000	2025-11-23 15:08:33.729
7	106	UYDAN	1000000	2026-02-13 18:35:48.064
8	108	UYDAN	1000000	2026-02-13 18:42:37.057
9	109	UYDAN	1000000	2026-02-13 18:53:12.061
10	110	CASH	500000	2026-02-13 19:20:01.26
11	110	UYDAN	500000	2026-02-13 19:20:01.26
12	111	CASH	500000	2026-02-13 19:25:33.906
13	111	UYDAN	500000	2026-02-13 19:25:33.906
14	226	CASH	750000	2026-04-20 15:27:16.985
15	226	INSTALLMENT	750000	2026-04-20 15:27:16.985
16	227	INSTALLMENT	750000	2026-04-20 15:49:08.121
17	227	CASH	750000	2026-04-20 15:49:08.121
18	228	INSTALLMENT	750000	2026-04-20 15:56:02.104
19	228	CASH	750000	2026-04-20 15:56:02.104
20	229	INSTALLMENT	750000	2026-04-20 16:00:25.145
21	229	CASH	750000	2026-04-20 16:00:25.145
22	230	CASH	750000	2026-04-21 14:03:55.192
23	230	INSTALLMENT	750000	2026-04-21 14:03:55.192
24	231	INSTALLMENT	750000	2026-04-21 15:33:05.691
25	231	CASH	750000	2026-04-21 15:33:05.691
26	232	CASH	750000	2026-04-21 15:35:29.4
27	232	INSTALLMENT	750000	2026-04-21 15:35:29.4
28	233	CASH	750000	2026-04-21 15:36:24.916
29	233	INSTALLMENT	750000	2026-04-21 15:36:24.916
30	234	CASH	500000	2026-04-21 15:48:03.74
31	234	UYDAN	1000000	2026-04-21 15:48:03.74
32	235	UYDAN	1500000	2026-04-21 15:52:43.853
33	236	UYDAN	1500000	2026-04-21 15:58:18.606
34	237	CASH	500000	2026-04-21 16:28:52.133
35	237	INSTALLMENT	1000000	2026-04-21 16:28:52.133
36	238	CASH	500000	2026-04-21 16:32:02.668
37	238	UYDAN	1000000	2026-04-21 16:32:02.668
38	240	CASH	250000	2026-04-22 15:09:03.121
39	240	CARD	250000	2026-04-22 15:09:03.121
40	240	TERMINAL	250000	2026-04-22 15:09:03.121
41	240	TOVAR	250000	2026-04-22 15:09:03.121
42	240	UYDAN	250000	2026-04-22 15:09:03.121
43	240	INSTALLMENT	250000	2026-04-22 15:09:03.121
44	242	TERMINAL	750000	2026-04-23 16:01:53.428
45	242	CASH	250000	2026-04-23 16:01:53.428
46	242	UYDAN	500000	2026-04-23 16:01:53.428
47	243	TOVAR	500000	2026-04-23 16:03:53.488
48	243	CARD	500000	2026-04-23 16:03:53.488
49	243	CASH	500000	2026-04-23 16:03:53.488
56	254	UYDAN	1000000	2026-04-24 18:11:57.745
57	254	CASH	500000	2026-04-24 18:11:57.745
58	255	UYDAN	3000000	2026-04-24 18:13:48.604
59	255	CARD	1500000	2026-04-24 18:13:48.604
60	256	CASH	1500000	2026-04-25 19:59:20.098
61	257	CARD	500000	2026-04-25 20:03:28.024
62	257	UYDAN	1000000	2026-04-25 20:03:28.024
63	258	UYDAN	1500000	2026-04-27 19:17:47.554
64	259	UYDAN	1500000	2026-04-27 19:20:03.308
65	260	UYDAN	1500000	2026-04-27 19:41:48.712
66	324	TERMINAL	1300000	2026-06-23 12:39:25.277
67	324	UYDAN	1300000	2026-06-23 12:39:25.277
68	324	CARD	1300000	2026-06-23 12:39:25.277
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "firstName", "lastName", phone, username, password, role, "branchId", "createdAt", "updatedAt", status, "workEndTime", "workStartTime", "workShift") FROM stdin;
2	Bek	Bek	Bek	bekbek	$2a$10$B9RPxrmQNR4mPJLnbLmii.9W5cXOU86BZP/KdDKq3VcrF4u39v7t2	ADMIN	2	2025-09-19 20:26:21.276	2026-02-12 20:02:22.877	ACTIVE	18:00	20:00	DAY
10	Dostavka	Dostavka	978979	dostavka	$2a$10$/mF.5D8WAhMtsxeuMo0i9uclrMdzVDIn2ayTRIICCCJRJC5X4igYS	AUDITOR	1	2025-11-12 18:07:05.93	2026-02-12 20:02:22.886	ACTIVE	18:00	20:00	DAY
6	v	v	v	bekbek1	$2a$10$B9RPxrmQNR4mPJLnbLmii.9W5cXOU86BZP/KdDKq3VcrF4u39v7t2	CASHIER	1	2025-09-19 20:28:05.205	2026-02-12 20:02:22.881	ACTIVE	18:00	20:00	DAY
7	Sotuvchu	Sotuvchi	132323	bekbek2	$2a$10$Edf3cKkZK5a5M1MH.Otzhu7mPufkGKU/biJEDs18.mwM9ER9JL38y	MARKETING	1	2025-09-19 22:12:46.632	2026-02-12 20:02:22.882	ACTIVE	18:00	20:00	DAY
9	phone	phone	+998323232232	phone	$2b$10$DUDjue0WTuiczHO0LFa1ye4te.qz55MBUl5nMqIZ4KSnKjqRAk03S	CASHIER	3	2025-09-23 20:31:27.15	2026-02-12 20:02:22.884	ACTIVE	18:00	20:00	DAY
15	123	123	998998999999	kassir	$2a$10$Ay9X10RReolIUHOmTtjcDOlgLfCyth.Lb00xLBtibWdgn3Ih.YkU.	CASHIER	1	2026-02-12 19:52:48.593	2026-02-12 20:02:43.776	ACTIVE	18:00	20:00	DAY
16	Call	Call	23142423	callcenter	$2a$10$ReqjP..Oo6GmNp3OuZg.quzvWhgSebgsTvmhuWRZuwz1bMTIf4via	OPERATOR	\N	2026-02-12 20:08:17.779	2026-02-12 20:07:32.117	ACTIVE	\N	\N	DAY
17	bek	bek	998232232323	alibek	$2b$10$PL7qLFwNSAYOAVxP2YoLK.vpkckX0VYc0MwgoyQjuQmJ0j6/TqmfK	OPERATORCALL	2	2026-02-12 20:15:08.963	2026-02-12 20:15:08.963	ACTIVE	18:00	20:00	DAY
8	Sklad	Sklad	23232	sklad	$2a$10$BbXAsGz3R2XsUQV2JqdXVueroNw4.OOW8EuqF3Ct3zdtNIsNDZiqO	WAREHOUSE	4	2025-09-19 23:15:42.301	2026-04-15 14:40:33.519	ACTIVE	18:00	20:00	DAY
18	btf	rtb	998928494824	hisobchi1	$2b$10$N2khs7eoUbxQAsy7JXcJE.alUyfq9tZGkyujV7TZy98oVhZzu6pNW	HISOBCHI	2	2026-04-27 09:44:44.058	2026-04-27 09:44:44.058	ACTIVE	18:00	20:00	DAY
19	Sotuvchi 1	Sotuvchi 1	998998889911	sotuvchi1	$2b$10$w6hhZrkAn3AlexBUbjsx3.anZu7N2g/UsvOh.1JfrmQiIreDQmVzi	MARKETING	\N	2026-06-18 14:11:55.695	2026-06-18 14:11:55.695	ACTIVE	18:00	20:00	DAY
\.


--
-- Data for Name: UserBranchAccess; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserBranchAccess" (id, "userId", "branchId", "createdAt", "updatedAt") FROM stdin;
1	15	1	2026-02-12 19:52:48.599	2026-02-12 19:52:48.599
2	15	3	2026-02-12 19:52:48.599	2026-02-12 19:52:48.599
3	15	2	2026-02-12 19:52:48.599	2026-02-12 19:52:48.599
6	17	2	2026-02-12 20:15:08.973	2026-02-12 20:15:08.973
7	8	1	2026-04-15 10:08:06.357	2026-04-15 10:08:06.357
9	18	2	2026-04-27 09:44:44.066	2026-04-27 09:44:44.066
15	19	3	2026-06-18 14:11:55.7	2026-06-18 14:11:55.7
\.


--
-- Data for Name: UserLocation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserLocation" ("userId", latitude, longitude, address, "isOnline", "lastSeen", "updatedAt") FROM stdin;
15	41.84343923858983	60.39239038417143	Updated location	f	2026-06-23 12:54:18.101	2026-06-23 12:54:18.101
16	41.56523592740385	60.60121716349244	Updated location	f	2026-04-21 16:55:18.008	2026-04-21 16:55:18.008
8	41.56649968795178	60.61410135208429	Updated location	f	2026-06-23 18:57:24.559	2026-06-23 18:57:24.559
17	41.56533246152272	60.60104509954757	Updated location	t	2026-04-21 17:00:49.835	2026-04-21 17:00:49.835
2	41.84352915140315	60.39234210906231	Updated location	f	2026-06-23 14:53:34.67	2026-06-23 14:53:34.67
10	41.84337967322934	60.39231772484055	Aminov, Sohibkor ko'chasi, Gurlan, Gurlan Tumani, Xorazm viloyati, 220300, Oʻzbekiston	f	2026-06-23 12:54:12.433	2026-06-23 12:54:12.433
\.


--
-- Data for Name: WorkSchedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkSchedule" (id, "workStartTime", "workEndTime", "isDefault", description, "createdAt", "updatedAt") FROM stdin;
1	20:00	18:00	t	Default work schedule	2025-09-25 20:14:33.552	2026-02-12 20:02:22.86
\.


--
-- Data for Name: barcodeCounter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."barcodeCounter" (id, counter, "createdAt", "updatedAt") FROM stdin;
1	713	2025-09-19 21:41:19.751	2026-06-20 14:56:56.43
\.


--
-- Data for Name: defective_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.defective_logs (id, "productId", quantity, description, "userId", "branchId", "cashAmount", "actionType", "createdAt", "exchangeWithProductId", "replacementQuantity", "replacementTransactionId", "replacementUnitPrice", "cashAdjustmentDirection", "handledByUserId", "transactionId") FROM stdin;
13	6	1	234	\N	1	-3440000	RETURN	2025-11-28 09:40:26	\N	\N	\N	\N	MINUS	6	92
20	2	2	123	\N	1	-1	RETURN	2026-03-14 20:54:18	\N	\N	\N	\N	MINUS	15	115
21	98	1	Tesst\n	\N	4	-1	RETURN	2026-06-23 11:32:53.937	\N	\N	\N	\N	MINUS	8	272
22	98	1	avraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervaeavraevaeraervae	\N	4	-100000	RETURN	2026-06-23 14:18:52.561	\N	\N	\N	\N	MINUS	8	324
\.


--
-- Name: AttendanceDay_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AttendanceDay_id_seq"', 1, false);


--
-- Name: AttendanceEvent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AttendanceEvent_id_seq"', 1, false);


--
-- Name: Bonus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Bonus_id_seq"', 121, true);


--
-- Name: Branch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Branch_id_seq"', 5, true);


--
-- Name: CashierReport_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CashierReport_id_seq"', 1, false);


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Category_id_seq"', 2, true);


--
-- Name: CreditRepayment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CreditRepayment_id_seq"', 44, true);


--
-- Name: CurrencyExchangeRate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CurrencyExchangeRate_id_seq"', 1, true);


--
-- Name: Customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Customer_id_seq"', 119, true);


--
-- Name: DailyExpense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DailyExpense_id_seq"', 4, true);


--
-- Name: DailyRepayment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DailyRepayment_id_seq"', 1, false);


--
-- Name: DriverRating_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."DriverRating_id_seq"', 1, false);


--
-- Name: FaceTemplate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."FaceTemplate_id_seq"', 1, false);


--
-- Name: GlobalRate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."GlobalRate_id_seq"', 1, true);


--
-- Name: PaymentRepayment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PaymentRepayment_id_seq"', 43, true);


--
-- Name: PaymentSchedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PaymentSchedule_id_seq"', 86, true);


--
-- Name: ProductTransfer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ProductTransfer_id_seq"', 1, false);


--
-- Name: Product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Product_id_seq"', 516, true);


--
-- Name: Task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Task_id_seq"', 12, true);


--
-- Name: TransactionBonusProduct_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TransactionBonusProduct_id_seq"', 24, true);


--
-- Name: TransactionItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TransactionItem_id_seq"', 525, true);


--
-- Name: TransactionPayment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TransactionPayment_id_seq"', 68, true);


--
-- Name: Transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Transaction_id_seq"', 324, true);


--
-- Name: UserBranchAccess_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."UserBranchAccess_id_seq"', 15, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 19, true);


--
-- Name: WorkSchedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."WorkSchedule_id_seq"', 1, true);


--
-- Name: barcodeCounter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."barcodeCounter_id_seq"', 1, true);


--
-- Name: defective_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.defective_logs_id_seq', 22, true);


--
-- Name: AttendanceDay AttendanceDay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceEvent AttendanceEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY (id);


--
-- Name: Bonus Bonus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bonus"
    ADD CONSTRAINT "Bonus_pkey" PRIMARY KEY (id);


--
-- Name: Branch Branch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_pkey" PRIMARY KEY (id);


--
-- Name: CashierReport CashierReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashierReport"
    ADD CONSTRAINT "CashierReport_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: CreditRepayment CreditRepayment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditRepayment"
    ADD CONSTRAINT "CreditRepayment_pkey" PRIMARY KEY (id);


--
-- Name: CurrencyExchangeRate CurrencyExchangeRate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CurrencyExchangeRate"
    ADD CONSTRAINT "CurrencyExchangeRate_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: DailyExpense DailyExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyExpense"
    ADD CONSTRAINT "DailyExpense_pkey" PRIMARY KEY (id);


--
-- Name: DailyRepayment DailyRepayment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyRepayment"
    ADD CONSTRAINT "DailyRepayment_pkey" PRIMARY KEY (id);


--
-- Name: DriverRating DriverRating_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DriverRating"
    ADD CONSTRAINT "DriverRating_pkey" PRIMARY KEY (id);


--
-- Name: FaceTemplate FaceTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FaceTemplate"
    ADD CONSTRAINT "FaceTemplate_pkey" PRIMARY KEY (id);


--
-- Name: GlobalRate GlobalRate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GlobalRate"
    ADD CONSTRAINT "GlobalRate_pkey" PRIMARY KEY (id);


--
-- Name: PaymentRepayment PaymentRepayment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentRepayment"
    ADD CONSTRAINT "PaymentRepayment_pkey" PRIMARY KEY (id);


--
-- Name: PaymentSchedule PaymentSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentSchedule"
    ADD CONSTRAINT "PaymentSchedule_pkey" PRIMARY KEY (id);


--
-- Name: ProductTransfer ProductTransfer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTransfer"
    ADD CONSTRAINT "ProductTransfer_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: TransactionBonusProduct TransactionBonusProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionBonusProduct"
    ADD CONSTRAINT "TransactionBonusProduct_pkey" PRIMARY KEY (id);


--
-- Name: TransactionItem TransactionItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionItem"
    ADD CONSTRAINT "TransactionItem_pkey" PRIMARY KEY (id);


--
-- Name: TransactionPayment TransactionPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionPayment"
    ADD CONSTRAINT "TransactionPayment_pkey" PRIMARY KEY (id);


--
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);


--
-- Name: UserBranchAccess UserBranchAccess_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBranchAccess"
    ADD CONSTRAINT "UserBranchAccess_pkey" PRIMARY KEY (id);


--
-- Name: UserLocation UserLocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserLocation"
    ADD CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("userId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WorkSchedule WorkSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkSchedule"
    ADD CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY (id);


--
-- Name: barcodeCounter barcodeCounter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."barcodeCounter"
    ADD CONSTRAINT "barcodeCounter_pkey" PRIMARY KEY (id);


--
-- Name: defective_logs defective_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defective_logs
    ADD CONSTRAINT defective_logs_pkey PRIMARY KEY (id);


--
-- Name: AttendanceDay_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceDay_branchId_idx" ON public."AttendanceDay" USING btree ("branchId");


--
-- Name: AttendanceDay_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceDay_date_idx" ON public."AttendanceDay" USING btree (date);


--
-- Name: AttendanceDay_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AttendanceDay_userId_date_key" ON public."AttendanceDay" USING btree ("userId", date);


--
-- Name: AttendanceDay_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceDay_userId_idx" ON public."AttendanceDay" USING btree ("userId");


--
-- Name: AttendanceEvent_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceEvent_branchId_idx" ON public."AttendanceEvent" USING btree ("branchId");


--
-- Name: AttendanceEvent_dayId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceEvent_dayId_idx" ON public."AttendanceEvent" USING btree ("dayId");


--
-- Name: AttendanceEvent_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceEvent_occurredAt_idx" ON public."AttendanceEvent" USING btree ("occurredAt");


--
-- Name: AttendanceEvent_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceEvent_userId_idx" ON public."AttendanceEvent" USING btree ("userId");


--
-- Name: Bonus_bonusDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bonus_bonusDate_idx" ON public."Bonus" USING btree ("bonusDate");


--
-- Name: Bonus_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bonus_branchId_idx" ON public."Bonus" USING btree ("branchId");


--
-- Name: Bonus_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bonus_createdById_idx" ON public."Bonus" USING btree ("createdById");


--
-- Name: Bonus_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bonus_transactionId_idx" ON public."Bonus" USING btree ("transactionId");


--
-- Name: Bonus_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Bonus_userId_idx" ON public."Bonus" USING btree ("userId");


--
-- Name: Branch_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Branch_name_idx" ON public."Branch" USING btree (name);


--
-- Name: CashierReport_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CashierReport_branchId_idx" ON public."CashierReport" USING btree ("branchId");


--
-- Name: CashierReport_cashierId_branchId_reportDate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CashierReport_cashierId_branchId_reportDate_key" ON public."CashierReport" USING btree ("cashierId", "branchId", "reportDate");


--
-- Name: CashierReport_cashierId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CashierReport_cashierId_idx" ON public."CashierReport" USING btree ("cashierId");


--
-- Name: CashierReport_reportDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CashierReport_reportDate_idx" ON public."CashierReport" USING btree ("reportDate");


--
-- Name: Category_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Category_branchId_idx" ON public."Category" USING btree ("branchId");


--
-- Name: Category_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Category_name_idx" ON public."Category" USING btree (name);


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);


--
-- Name: CreditRepayment_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditRepayment_branchId_idx" ON public."CreditRepayment" USING btree ("branchId");


--
-- Name: CreditRepayment_paidAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditRepayment_paidAt_idx" ON public."CreditRepayment" USING btree ("paidAt");


--
-- Name: CreditRepayment_paidByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditRepayment_paidByUserId_idx" ON public."CreditRepayment" USING btree ("paidByUserId");


--
-- Name: CreditRepayment_scheduleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditRepayment_scheduleId_idx" ON public."CreditRepayment" USING btree ("scheduleId");


--
-- Name: CreditRepayment_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditRepayment_transactionId_idx" ON public."CreditRepayment" USING btree ("transactionId");


--
-- Name: CurrencyExchangeRate_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CurrencyExchangeRate_branchId_idx" ON public."CurrencyExchangeRate" USING btree ("branchId");


--
-- Name: CurrencyExchangeRate_fromCurrency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CurrencyExchangeRate_fromCurrency_idx" ON public."CurrencyExchangeRate" USING btree ("fromCurrency");


--
-- Name: CurrencyExchangeRate_fromCurrency_toCurrency_branchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CurrencyExchangeRate_fromCurrency_toCurrency_branchId_key" ON public."CurrencyExchangeRate" USING btree ("fromCurrency", "toCurrency", "branchId");


--
-- Name: CurrencyExchangeRate_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CurrencyExchangeRate_isActive_idx" ON public."CurrencyExchangeRate" USING btree ("isActive");


--
-- Name: CurrencyExchangeRate_toCurrency_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CurrencyExchangeRate_toCurrency_idx" ON public."CurrencyExchangeRate" USING btree ("toCurrency");


--
-- Name: Customer_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Customer_email_key" ON public."Customer" USING btree (email);


--
-- Name: Customer_jshshir_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_jshshir_idx" ON public."Customer" USING btree (jshshir);


--
-- Name: Customer_passportSeries_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_passportSeries_idx" ON public."Customer" USING btree ("passportSeries");


--
-- Name: Customer_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_phone_idx" ON public."Customer" USING btree (phone);


--
-- Name: Customer_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Customer_phone_key" ON public."Customer" USING btree (phone);


--
-- Name: DailyRepayment_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyRepayment_branchId_idx" ON public."DailyRepayment" USING btree ("branchId");


--
-- Name: DailyRepayment_paidAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyRepayment_paidAt_idx" ON public."DailyRepayment" USING btree ("paidAt");


--
-- Name: DailyRepayment_paidByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyRepayment_paidByUserId_idx" ON public."DailyRepayment" USING btree ("paidByUserId");


--
-- Name: DailyRepayment_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyRepayment_transactionId_idx" ON public."DailyRepayment" USING btree ("transactionId");


--
-- Name: DriverRating_driverId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DriverRating_driverId_idx" ON public."DriverRating" USING btree ("driverId");


--
-- Name: DriverRating_driverId_transactionId_ratedBy_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DriverRating_driverId_transactionId_ratedBy_key" ON public."DriverRating" USING btree ("driverId", "transactionId", "ratedBy");


--
-- Name: DriverRating_ratedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DriverRating_ratedBy_idx" ON public."DriverRating" USING btree ("ratedBy");


--
-- Name: DriverRating_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DriverRating_transactionId_idx" ON public."DriverRating" USING btree ("transactionId");


--
-- Name: FaceTemplate_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FaceTemplate_userId_idx" ON public."FaceTemplate" USING btree ("userId");


--
-- Name: PaymentRepayment_paidAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentRepayment_paidAt_idx" ON public."PaymentRepayment" USING btree ("paidAt");


--
-- Name: PaymentRepayment_scheduleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentRepayment_scheduleId_idx" ON public."PaymentRepayment" USING btree ("scheduleId");


--
-- Name: PaymentRepayment_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentRepayment_transactionId_idx" ON public."PaymentRepayment" USING btree ("transactionId");


--
-- Name: ProductTransfer_fromBranchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTransfer_fromBranchId_idx" ON public."ProductTransfer" USING btree ("fromBranchId");


--
-- Name: ProductTransfer_initiatedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTransfer_initiatedById_idx" ON public."ProductTransfer" USING btree ("initiatedById");


--
-- Name: ProductTransfer_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTransfer_productId_idx" ON public."ProductTransfer" USING btree ("productId");


--
-- Name: ProductTransfer_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTransfer_status_idx" ON public."ProductTransfer" USING btree (status);


--
-- Name: ProductTransfer_toBranchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTransfer_toBranchId_idx" ON public."ProductTransfer" USING btree ("toBranchId");


--
-- Name: Product_barcode_branchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Product_barcode_branchId_key" ON public."Product" USING btree (barcode, "branchId");


--
-- Name: Product_branchId_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_branchId_isDeleted_idx" ON public."Product" USING btree ("branchId", "isDeleted");


--
-- Name: Product_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_isDeleted_idx" ON public."Product" USING btree ("isDeleted");


--
-- Name: Task_auditorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_auditorId_idx" ON public."Task" USING btree ("auditorId");


--
-- Name: Task_isUydanCollected_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_isUydanCollected_idx" ON public."Task" USING btree ("isUydanCollected");


--
-- Name: Task_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_status_idx" ON public."Task" USING btree (status);


--
-- Name: Task_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_transactionId_idx" ON public."Task" USING btree ("transactionId");


--
-- Name: Task_uydanCollectedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_uydanCollectedById_idx" ON public."Task" USING btree ("uydanCollectedById");


--
-- Name: TransactionBonusProduct_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TransactionBonusProduct_productId_idx" ON public."TransactionBonusProduct" USING btree ("productId");


--
-- Name: TransactionBonusProduct_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TransactionBonusProduct_transactionId_idx" ON public."TransactionBonusProduct" USING btree ("transactionId");


--
-- Name: TransactionPayment_transactionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TransactionPayment_transactionId_idx" ON public."TransactionPayment" USING btree ("transactionId");


--
-- Name: Transaction_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_createdAt_idx" ON public."Transaction" USING btree ("createdAt");


--
-- Name: Transaction_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_customerId_idx" ON public."Transaction" USING btree ("customerId");


--
-- Name: Transaction_fromBranchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_fromBranchId_idx" ON public."Transaction" USING btree ("fromBranchId");


--
-- Name: Transaction_soldByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_soldByUserId_idx" ON public."Transaction" USING btree ("soldByUserId");


--
-- Name: Transaction_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_status_idx" ON public."Transaction" USING btree (status);


--
-- Name: Transaction_toBranchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_toBranchId_idx" ON public."Transaction" USING btree ("toBranchId");


--
-- Name: Transaction_transactionType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_transactionType_idx" ON public."Transaction" USING btree ("transactionType");


--
-- Name: Transaction_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_type_idx" ON public."Transaction" USING btree (type);


--
-- Name: Transaction_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Transaction_userId_idx" ON public."Transaction" USING btree ("userId");


--
-- Name: UserBranchAccess_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBranchAccess_branchId_idx" ON public."UserBranchAccess" USING btree ("branchId");


--
-- Name: UserBranchAccess_userId_branchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserBranchAccess_userId_branchId_key" ON public."UserBranchAccess" USING btree ("userId", "branchId");


--
-- Name: UserBranchAccess_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBranchAccess_userId_idx" ON public."UserBranchAccess" USING btree ("userId");


--
-- Name: User_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_branchId_idx" ON public."User" USING btree ("branchId");


--
-- Name: User_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_phone_idx" ON public."User" USING btree (phone);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: WorkSchedule_isDefault_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkSchedule_isDefault_idx" ON public."WorkSchedule" USING btree ("isDefault");


--
-- Name: AttendanceDay AttendanceDay_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceDay AttendanceDay_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceDay"
    ADD CONSTRAINT "AttendanceDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AttendanceEvent AttendanceEvent_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceEvent AttendanceEvent_dayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES public."AttendanceDay"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceEvent AttendanceEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bonus Bonus_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bonus"
    ADD CONSTRAINT "Bonus_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bonus Bonus_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bonus"
    ADD CONSTRAINT "Bonus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bonus Bonus_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bonus"
    ADD CONSTRAINT "Bonus_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bonus Bonus_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Bonus"
    ADD CONSTRAINT "Bonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CashierReport CashierReport_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashierReport"
    ADD CONSTRAINT "CashierReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CashierReport CashierReport_cashierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashierReport"
    ADD CONSTRAINT "CashierReport_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Category Category_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CreditRepayment CreditRepayment_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditRepayment"
    ADD CONSTRAINT "CreditRepayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CreditRepayment CreditRepayment_paidByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditRepayment"
    ADD CONSTRAINT "CreditRepayment_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CreditRepayment CreditRepayment_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditRepayment"
    ADD CONSTRAINT "CreditRepayment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."PaymentSchedule"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CreditRepayment CreditRepayment_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditRepayment"
    ADD CONSTRAINT "CreditRepayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CurrencyExchangeRate CurrencyExchangeRate_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CurrencyExchangeRate"
    ADD CONSTRAINT "CurrencyExchangeRate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CurrencyExchangeRate CurrencyExchangeRate_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CurrencyExchangeRate"
    ADD CONSTRAINT "CurrencyExchangeRate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyRepayment DailyRepayment_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyRepayment"
    ADD CONSTRAINT "DailyRepayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyRepayment DailyRepayment_paidByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyRepayment"
    ADD CONSTRAINT "DailyRepayment_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DailyRepayment DailyRepayment_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyRepayment"
    ADD CONSTRAINT "DailyRepayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DriverRating DriverRating_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DriverRating"
    ADD CONSTRAINT "DriverRating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DriverRating DriverRating_ratedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DriverRating"
    ADD CONSTRAINT "DriverRating_ratedBy_fkey" FOREIGN KEY ("ratedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DriverRating DriverRating_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DriverRating"
    ADD CONSTRAINT "DriverRating_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FaceTemplate FaceTemplate_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FaceTemplate"
    ADD CONSTRAINT "FaceTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentRepayment PaymentRepayment_paidByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentRepayment"
    ADD CONSTRAINT "PaymentRepayment_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentRepayment PaymentRepayment_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentRepayment"
    ADD CONSTRAINT "PaymentRepayment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."PaymentSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentRepayment PaymentRepayment_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentRepayment"
    ADD CONSTRAINT "PaymentRepayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentSchedule PaymentSchedule_paidByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentSchedule"
    ADD CONSTRAINT "PaymentSchedule_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentSchedule PaymentSchedule_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentSchedule"
    ADD CONSTRAINT "PaymentSchedule_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTransfer ProductTransfer_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTransfer"
    ADD CONSTRAINT "ProductTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTransfer ProductTransfer_fromBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTransfer"
    ADD CONSTRAINT "ProductTransfer_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTransfer ProductTransfer_initiatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTransfer"
    ADD CONSTRAINT "ProductTransfer_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTransfer ProductTransfer_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTransfer"
    ADD CONSTRAINT "ProductTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductTransfer ProductTransfer_toBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTransfer"
    ADD CONSTRAINT "ProductTransfer_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Task Task_auditorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_uydanCollectedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_uydanCollectedById_fkey" FOREIGN KEY ("uydanCollectedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransactionBonusProduct TransactionBonusProduct_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionBonusProduct"
    ADD CONSTRAINT "TransactionBonusProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransactionBonusProduct TransactionBonusProduct_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionBonusProduct"
    ADD CONSTRAINT "TransactionBonusProduct_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransactionItem TransactionItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionItem"
    ADD CONSTRAINT "TransactionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransactionItem TransactionItem_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionItem"
    ADD CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransactionPayment TransactionPayment_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionPayment"
    ADD CONSTRAINT "TransactionPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Transaction Transaction_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_fromBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Transaction Transaction_soldByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_soldByUserId_fkey" FOREIGN KEY ("soldByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_toBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Transaction Transaction_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserBranchAccess UserBranchAccess_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBranchAccess"
    ADD CONSTRAINT "UserBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserBranchAccess UserBranchAccess_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBranchAccess"
    ADD CONSTRAINT "UserBranchAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserLocation UserLocation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserLocation"
    ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: defective_logs defective_logs_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defective_logs
    ADD CONSTRAINT "defective_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: defective_logs defective_logs_handledByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defective_logs
    ADD CONSTRAINT "defective_logs_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: defective_logs defective_logs_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defective_logs
    ADD CONSTRAINT "defective_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: defective_logs defective_logs_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defective_logs
    ADD CONSTRAINT "defective_logs_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: defective_logs defective_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defective_logs
    ADD CONSTRAINT "defective_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

