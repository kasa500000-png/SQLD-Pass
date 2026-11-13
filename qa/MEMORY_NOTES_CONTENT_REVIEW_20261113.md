# 핵심 노트 검수 후보

콘텐츠 textbook.20261113.2 / 5473eb0f7f166e8caf7b4eb7dc168e6e42592449a1bf7064fccebb9f38adc64f

기존 교재와 모의고사는 변경하지 않았습니다. 아래는 앱에서 읽는 최종 내용입니다.

## 빠른 암기

- **NVL2**: NVL2(A,B,C) → A가 NULL 아니면 B, NULL이면 C

- **NULL과 0**: 0 ≠ NULL / Oracle에서 빈 문자열('')은 현재 NULL 취급

- **COUNT**: COUNT(*) 전체 행 / COUNT(열) NULL 제외

- **후보키**: 후보키 = 슈퍼키 + 최소성

- **SQL 순서**: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY

- **WHERE·HAVING**: WHERE는 개별 행 / HAVING은 집계 그룹 필터

- **3값 논리**: NULL = NULL → UNKNOWN / 비교 대신 IS NULL

- **NOT IN**: 목록에 NULL이 있으면 미일치도 UNKNOWN 가능

- **LEFT JOIN**: 우측 조건을 WHERE에 넣으면 미매칭 행이 제거될 수 있음

- **순위 함수**: RANK 1·1·3 / DENSE_RANK 1·1·2 / ROW_NUMBER 1·2·3

- **ROLLUP·CUBE**: 단순 그룹화 컬럼 n개 → ROLLUP n+1개 / CUBE 2ⁿ개 그룹 집합. 출력 행 수와는 다름.

- **데이터 삭제**: DELETE: DML / TRUNCATE·DROP: DDL(Oracle)

## 데이터 모델링

### 데이터 모델링 3단계 (model-01)



개념적 → 논리적 → 물리적

주의: 개념적 모델에 DBMS 특정 자료형을 먼저 지정하는 것은 일반적인 단계 구분과 맞지 않는다.

개념적 모델은 주요 엔터티와 관계를 업무 관점에서 파악한다. 논리적 모델은 엔터티·속성·식별자·정규화·관계를 상세히 정의한다. 물리적 모델은 DBMS에 맞춰 테이블·컬럼·인덱스·데이터 타입 등을 구체화한다.



### 모델링의 3대 특징 (model-02)



추상화 · 단순화 · 명확화



현실 업무를 추상화하여 핵심만 표현하고, 단순화하여 이해하기 쉽게 만들며, 명확화하여 중의성을 줄이는 과정이다.



### 3층 스키마와 데이터 독립성 (model-03)



외부·개념·내부 스키마 / 논리적·물리적 독립성



외부 스키마는 사용자별 뷰, 개념 스키마는 조직 전체 데이터의 논리 구조, 내부 스키마는 물리 저장 구조다. 논리적 독립성: 개념 구조 변경이 외부 뷰에 미치는 영향을 줄임. 물리적 독립성: 내부 저장 방식 변경이 개념·외부 스키마에 미치는 영향을 줄임.



### 엔터티 분류 (model-05)



유형·개념·사건 / 기본·중심·행위



유무형 기준: 유형(사원·물품), 개념(부서·상품분류), 사건(주문·결제). 발생시점 기준: 기본/키 엔터티(고객), 중심 엔터티(계약), 행위 엔터티(계약변경·주문상세).



### 속성 분류와 도메인 (model-06)



기본·설계·파생 속성 / 도메인은 값의 허용 범위



기본 속성은 업무로부터 직접 도출, 설계 속성은 시스템 관리상 추가, 파생 속성은 다른 속성으로 계산한다. 도메인은 속성이 취할 수 있는 데이터 타입, 길이, 범위 등의 제한이다.



### 식별자의 4가지 특징 (model-07)

필수

유일성 · 최소성 · 불변성 · 존재성

주의: 후보키의 공식 성질은 유일성과 최소성이다. 주식별자 선정 시 불변성과 존재성까지 고려한다.

식별자는 각 인스턴스를 유일하게 구분하고(유일성), 필요 최소 속성으로 구성되며(최소성), 되도록 값이 변하지 않고(불변성), 반드시 값이 존재해야 한다(존재성).



### 슈퍼키·후보키·기본키·대체키 (model-08)

필수

후보키 = 슈퍼키 + 최소성

주의: 전체 컬럼 {A,B,C,D,E}도 슈퍼키이지만 최소성이 없어 후보키가 아니다.

슈퍼키는 모든 속성을 결정할 수 있는 속성 집합, 후보키는 그중 하나라도 빼면 유일성이 깨지는 최소 집합, 기본키(PK)는 후보키 중 선택한 것, 대체키는 선택되지 않은 후보키다.

```sql
R(A,B,C,D,E)
FD: AB → C, C → A, DE → B
후보키: {A,D,E}, {C,D,E}
```

### 함수 종속과 폐포(X⁺) (model-09)

필수

X → Y: X가 같으면 Y도 같다

주의: 함수 종속 X → Y에서 화살표는 반드시 연산으로 값을 만든다는 뜻이 아니라 X가 Y를 결정한다는 뜻이다.

속성 집합 X의 폐포 X⁺는 X로부터 함수 종속을 반복 적용해 알아낼 수 있는 속성의 전체 집합이다. X⁺가 전체 속성이면 슈퍼키이며, 진부분집합으로는 전체를 못 만들면 후보키다.

```sql
{A,D,E}⁺
초기: A,D,E
DE → B : A,B,D,E
AB → C : A,B,C,D,E
```

### 후보키 빠른 탐색법 (model-10)

필수

어느 FD의 오른쪽에도 없는 속성은 반드시 포함



R의 모든 속성을 도출해야 하므로 함수 종속의 우변에 한 번도 나타나지 않는 속성은 다른 속성으로부터 얻을 수 없다. 따라서 모든 후보키에 포함된다. 그 뒤 나머지 속성을 최소한만 더해 폐포를 계산한다.

```sql
AB → C, C → A, DE → B
우변에 없는 속성: D,E
DE⁺={D,E,B} (부족)
ADE⁺=ABCDE, CDE⁺=ABCDE
```

### 식별 관계 vs 비식별 관계 (model-11)



식별: 부모 PK가 자식 PK에 포함 / 비식별: 일반 FK

주의: 비식별 관계 = 외래키가 반드시 NULL 허용이라는 의미는 아니다.

식별 관계는 부모 식별자가 자식 기본키 구성에 참여하며, 비식별 관계는 부모 식별자가 자식의 일반 외래키로 들어간다. 비식별 관계에서도 업무 규칙에 따라 FK가 NOT NULL일 수 있다.



### 관계의 차수·선택성 (model-12)



1:1 · 1:N · N:M / 필수 vs 선택



카디널리티는 대응 건수(1:1·1:N 등), 참여 선택성은 반드시 연관되어야 하는지 여부다. N:M 관계는 관계형 구현에서 보통 연결(교차) 테이블로 풀어낸다.



### 정규화 1NF·2NF·3NF·BCNF (model-13)

필수

1NF 원자값, 2NF 부분 종속 제거, 3NF 이행 종속 제거

주의: 기본키가 단일 컬럼이면 그 기본키에 관한 부분 종속은 성립하지 않는다. 다만 후보키 등 전체 함수 종속도 따져야 한다.

1NF: 반복 그룹 없이 원자값. 2NF: 1NF이며 후보키의 진부분집합에 비주요 속성이 종속되는 부분 함수 종속 제거. 3NF: 비주요 속성의 이행적 종속 제거. BCNF: 모든 비자명 함수 종속 X→Y에서 X가 슈퍼키.

```sql
(학번, 과목코드) → 성적
학번 → 학생명       ← 부분 종속 (2NF 위반)
부서코드 → 부서명   ← 이행 종속 가능
```

### 이상 현상과 반정규화 (model-14)



삽입·갱신·삭제 이상 / 성능 위해 중복 허용

주의: 정규화가 항상 성능을 떨어뜨리는 것은 아니다.

정규화는 이상 현상을 줄이고 중복을 통제한다. 반정규화는 조회 성능이나 처리 효율을 위해 정규화된 구조를 의도적으로 중복·통합하는 방법이다. 데이터 일관성 및 갱신 비용을 함께 고려한다.



### NULL 속성·인조식별자 (model-15)



NULL은 미정·부재 / 인조식별자는 업무 외 생성값



NULL 허용과 필수 참여 여부는 별도 설계 판단이다. 본질식별자는 업무상 자연스럽게 존재(주민번호 대신 업무번호 등), 인조식별자는 시스템에서 발급(일련번호)한다. 인조식별자는 편리하지만 업무상 중복을 자동으로 막아주지는 않는다.



## SQL 기본·조건

### SQL 논리 처리 순서 (basic-01)

필수

FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY

주의: SELECT에서 만든 별칭은 표준 SQL의 WHERE에서 사용할 수 없다. ORDER BY에서는 대체로 가능하다.

문장을 쓰는 순서와 실제 논리 처리 순서를 구분한다. 정렬·상위 N개 제한은 일반적으로 뒤 단계다. SQL 엔진의 물리적 실행계획은 이 순서를 재배치할 수 있다.

```sql
SELECT deptno, COUNT(*) AS cnt
FROM emp
WHERE sal >= 2000
GROUP BY deptno
HAVING COUNT(*) >= 2
ORDER BY cnt DESC;
```

### SELECT·DISTINCT·별칭 (basic-02)

필수

DISTINCT는 선택된 열 조합의 중복 행 제거



SELECT DISTINCT a,b는 (a,b) 조합이 같은 중복을 제거한다. 컬럼별로 독립 적용되지 않는다. 별칭 AS는 SELECT/ORDER BY에서 흔하게 사용하며, 테이블 별칭은 Oracle에서 AS 없이 쓴다.

```sql
SELECT DISTINCT deptno, job FROM emp;
SELECT sal * 12 AS annual_sal FROM emp;
```

### WHERE 비교·논리 연산자 (basic-03)

필수

=, <>, !=, >, >=, <, <= / NOT > AND > OR

주의: NULL과의 비교는 = 또는 <> 대신 IS NULL / IS NOT NULL.

비교는 각 행에 적용된다. AND가 OR보다 먼저 평가된다. 괄호로 의도를 명확히 하면 오해가 없다.

```sql
WHERE deptno = 10 OR deptno = 20 AND sal > 3000
-- (deptno = 10) OR (deptno=20 AND sal>3000)
```

### BETWEEN·IN·LIKE (basic-04)

필수

BETWEEN 양 끝 포함 / IN은 OR / %는 0자 이상, _는 정확히 1자

주의: 문자 % 자체를 찾으려면 ESCAPE가 필요: LIKE '%\%%' ESCAPE '\'.

BETWEEN 10 AND 20은 10,20 포함. NOT BETWEEN은 범위 밖. IN (1,2,3)은 각각의 동일 비교를 OR로 묶은 것에 가깝다. LIKE는 패턴을 비교한다.

```sql
WHERE sal BETWEEN 1000 AND 2000
WHERE job IN ('CLERK','ANALYST')
WHERE name LIKE '김%'
WHERE name LIKE '_수%'
```

### NULL의 3값 논리 (basic-05)

필수

TRUE / FALSE / UNKNOWN

주의: WHERE NOT (col = 10)은 col이 NULL인 행을 포함하지 않는다.

SQL에서 NULL과의 일반 비교 결과는 UNKNOWN이다. WHERE는 TRUE인 행만 통과시킨다. NOT UNKNOWN 역시 UNKNOWN이다. NULL은 0, 공백, 빈 문자열과 개념상 다르다(Oracle의 빈 문자열 처리 예외).

```sql
NULL = NULL      → UNKNOWN
NULL <> 0        → UNKNOWN
NULL IS NULL     → TRUE
```

### ORDER BY 정렬·NULL (basic-06)



ASC 오름차순 / DESC 내림차순 / NULLS FIRST·LAST

주의: ORDER BY가 없으면 저장·조회 순서는 보장되지 않는다.

ORDER BY는 SELECT 별칭 또는 위치번호를 사용할 수 있다. 기본 NULL 정렬 위치는 DBMS마다 다르며 Oracle 기본은 ASC에 NULLS LAST, DESC에 NULLS FIRST다. 명확하려면 NULLS FIRST/LAST를 명시한다.

```sql
ORDER BY sal DESC NULLS LAST
ORDER BY deptno ASC, sal DESC
```

### 산술과 NULL (basic-07)



NULL + 10 = NULL / 0은 유효한 숫자



NULL은 알 수 없는 값이므로 산술 연산은 일반적으로 NULL을 반환한다. 0은 정상적인 수치이므로 NVL(0, 9) = 0.

```sql
SELECT 10 + NULL FROM dual;  -- NULL
SELECT NVL(0, 9) FROM dual; -- 0
```

### 조건부 표현 CASE (basic-10)



CASE WHEN 조건 THEN 값 ELSE 값 END



검색 CASE는 조건을 차례로 비교한다. 단순 CASE는 식의 값과 WHEN의 값을 비교한다. ELSE 생략 후 어떤 조건도 맞지 않으면 NULL.

```sql
CASE WHEN score >= 90 THEN 'A'
     WHEN score >= 80 THEN 'B'
     ELSE 'C' END
CASE grade WHEN 1 THEN '우수' ELSE '기타' END
```

### 문자 연결 연산자 (basic-11)



Oracle의 || 는 문자열 결합

주의: 연결 연산자 || 는 Oracle 예시이다. DBMS에 따라 CONCAT 문법·NULL 처리 차이가 있다.

Oracle에서 문자열을 붙일 때 ||, CONCAT(a,b)를 쓴다. Oracle에서 NULL 또는 길이 0 문자열이 연결되면 특별한 NULL 처리 동작이 있으므로 산술 NULL 전파와 혼동하지 않는다.

```sql
SELECT 'SQL' || 'D' FROM dual;   -- SQLD
SELECT 'A' || NULL FROM dual; -- A
```

## 함수·NULL

### NVL(expr1, expr2) (functions-01)

필수

첫 번째 값이 NULL이면 두 번째 반환



NVL(A,B)는 A가 NULL이 아니면 A, NULL이면 B를 반환한다. 숫자 0은 NULL이 아니다.

```sql
NVL(NULL, 10) → 10
NVL(0, 10)    → 0
```

### NVL2(expr1, expr2, expr3) (functions-02)

필수

첫 번째가 NULL 아니면 두 번째, NULL이면 세 번째

주의: 0은 NULL이 아니므로 NVL2(0,10,20) 정답은 10.

세 인수 중 첫 번째는 값 유무를 검사하는 조건부 역할이다. 반환되는 값은 첫 번째 값 자체가 아니라 두 번째 또는 세 번째다.

```sql
NVL2(0, 10, 20)    → 10
NVL2(NULL, 10, 20) → 20
NVL2(0, 0, 0)      → 0
```

### NULLIF(expr1, expr2) (functions-03)

필수

두 값이 같으면 NULL, 다르면 첫 번째 값



NULLIF(A,B)는 두 표현식이 동일한 경우 NULL을 반환하고, 다르면 A를 반환한다. 조건 분기로 볼 수 있다.

```sql
NULLIF(10,10) → NULL
NULLIF(10,20) → 10
```

### COALESCE(a,b,c,...) (functions-04)

필수

왼쪽부터 첫 번째 NULL 아닌 값

주의: 0이 나오면 다음 값 10으로 넘어가지 않는다.

여러 표현식 중 NULL이 아닌 첫 번째 값을 반환한다. 모든 인수가 NULL이면 NULL이다.

```sql
COALESCE(NULL, 0, 10) → 0
COALESCE(NULL, NULL, 5) → 5
```

### DECODE(Oracle) (functions-05)

필수

DECODE(값, 비교1, 결과1, ..., 기본값)

주의: DECODE의 NULL 비교는 일반적인 SQL = NULL 비교와 다르다.

Oracle의 단순 동등 비교 분기 함수로 CASE와 유사하다. 마지막 기본값을 생략하고 매칭이 없으면 NULL이다. Oracle DECODE는 NULL과 NULL을 일치한다고 취급하는 특징이 있다.

```sql
DECODE(10, 10, 'A', 20, 'B', '기타') → 'A'
DECODE(NULL, NULL, '일치', '불일치') → '일치'
```

### COUNT(*) vs COUNT(열) (functions-07)

필수

COUNT(*)는 행 수 / COUNT(열)은 NULL 제외

주의: COUNT(*)는 해당 행의 모든 컬럼이 NULL이더라도 행이 존재하면 센다.

COUNT(*)는 조건을 통과한 모든 행을 세며 COUNT(col)은 해당 열의 NULL을 뺀 개수를 센다. COUNT(DISTINCT col)은 NULL을 제외한 서로 다른 값의 개수다.

```sql
salary = [100, NULL, 100, 200]
COUNT(*)=4
COUNT(salary)=3
COUNT(DISTINCT salary)=2
```

### 집계 함수와 NULL (functions-08)

필수

SUM/AVG/MIN/MAX는 NULL 무시

주의: AVG(x)는 NULL을 0으로 치환해 나누지 않는다.

NULL인 개별 입력은 대개 집계에서 제외된다. SUM/AVG/MIN/MAX는 유효 값이 하나도 없으면 NULL이다. COUNT는 이 경우 0을 반환한다.

```sql
x=[10, NULL, 20]
SUM(x)=30, AVG(x)=15
COUNT(x)=2, COUNT(*)=3
```

### ROUND·TRUNC (functions-09)

필수

ROUND 반올림 / TRUNC 버림(0방향 절삭)



두 번째 인수는 소수점 자릿수다. 음수를 넣으면 정수부의 자리에서 반올림·절삭한다. 숫자 TRUNC는 절댓값이 아니라 0 방향으로 절삭한다.

```sql
ROUND(123.456, 2) → 123.46
TRUNC(123.456, 2) → 123.45
ROUND(1234, -2)   → 1200
TRUNC(-12.9)      → -12
```

### CEIL·FLOOR·MOD·ABS (functions-10)



올림·내림·나머지·절댓값



CEIL은 입력보다 크거나 같은 최소 정수, FLOOR는 작거나 같은 최대 정수다. 음수에서 결과를 주의한다.

```sql
CEIL(1.2)=2, FLOOR(1.9)=1
CEIL(-1.2)=-1, FLOOR(-1.2)=-2
MOD(10,3)=1, ABS(-5)=5
```

### SUBSTR·LENGTH·INSTR (functions-11)

필수

부분 문자열 / 글자 수 / 부분 문자열 위치



Oracle SUBSTR의 시작 위치는 1부터, INSTR의 검색 위치도 1부터 센다. LENGTH는 글자 수(멀티바이트 문자의 바이트 수와 다를 수 있음).

```sql
SUBSTR('ABCDE', 2, 3) → 'BCD'
LENGTH('ABCDE') → 5
INSTR('ABABA','BA') → 2
```

### TRIM·LTRIM·RTRIM (functions-12)



양쪽·왼쪽·오른쪽 불필요 문자 제거



TRIM은 기본적으로 양끝 공백 제거. LTRIM/RTRIM은 지정된 문자 집합을 가장자리에서 반복 제거한다. REPLACE는 문자열 내부의 지정 부분을 치환한다.

```sql
TRIM('  SQL  ') → 'SQL'
LTRIM('xxSQLx','x') → 'SQLx'
REPLACE('ABAB','AB','C') → 'CC'
```

### 날짜 함수 SYSDATE·ADD_MONTHS (functions-15)



현재 날짜/시각 · 월 더하기



Oracle DATE에는 날짜뿐 아니라 시각도 포함된다. ADD_MONTHS는 월 단위 이동, LAST_DAY는 그 달의 마지막 날짜를 구한다. 정확한 반환 일자는 시작일·말일 규칙에 좌우된다.

```sql
ADD_MONTHS(DATE '2026-01-15', 1) → 2026-02-15
LAST_DAY(DATE '2026-02-10') → 2026-02-28
```

### 날짜 산술·MONTHS_BETWEEN (functions-16)



Oracle 날짜 - 날짜 = 일수 / 날짜 + 1 = 하루 뒤

주의: DATE에 시각이 들어 있으면 차이가 소수 일수로 나타날 수 있다.

Oracle DATE끼리 빼면 일 단위 숫자가 나온다. MONTHS_BETWEEN(a,b)는 개월 차이. EXTRACT(YEAR FROM ...)로 연도 등을 꺼낼 수 있다.

```sql
DATE '2026-01-03' - DATE '2026-01-01' → 2
DATE '2026-01-01' + 1 → 다음 날
```

### TO_CHAR·TO_DATE·TO_NUMBER (functions-17)

필수

형식 문자열로 명시적 변환

주의: 형식 없이 암묵적 날짜 변환하면 세션 NLS 설정에 의존해 오류나 오해가 생긴다.

날짜를 문자로 출력할 때 TO_CHAR(date, format), 문자를 날짜로 바꿀 때 TO_DATE(text, format), 문자를 숫자로 바꿀 때 TO_NUMBER를 사용한다.

```sql
TO_CHAR(DATE '2026-11-14','YYYY-MM-DD') → '2026-11-14'
TO_DATE('2026-11-14','YYYY-MM-DD')
```

### 날짜·문자 포맷 구분 (functions-18)

필수

YYYY 연도 / MM 월 / DD 일 / HH24 시 / MI 분 / SS 초



월은 MM, 분은 MI라는 차이를 특히 기억한다. 날짜 출력 TO_CHAR와 문자열을 날짜로 해석하는 TO_DATE의 인수 역할도 구분한다.

```sql
TO_CHAR(SYSDATE,'YYYY-MM-DD HH24:MI:SS')
```

### 문자와 숫자의 NULL 구분 (functions-19)



0 ≠ NULL / Oracle의 빈 문자열은 NULL 취급

주의: Oracle의 현재 동작: ''는 NULL 취급, ' '(공백 한 칸)은 NULL이 아니다.

Oracle은 길이가 0인 문자값 ''를 현재 NULL로 취급한다(향후 변경 가능성 공식 고지). 다른 DBMS는 다를 수 있다. 공백 한 칸 ' '은 빈 문자열과 다르다.

```sql
NVL('', '대체') → '대체'   -- Oracle
NVL(' ', '대체') → ' '      -- Oracle
```

### 집계+NVL 결과 차이 (functions-20)

필수

SUM(NVL(x,0))와 NVL(SUM(x),0) 차이

주의: NULL값만 있는 행과 아예 행이 없는 집합은 다르다.

행이 있고 모든 x가 NULL인 그룹이라면 SUM(NVL(x,0))=0이고 NVL(SUM(x),0)=0이다. GROUP BY 없이 전체를 집계할 때 입력 행이 0개이면 SUM(NVL(x,0))은 NULL, NVL(SUM(x),0)은 0이다. GROUP BY로 묶을 행 자체가 없으면 결과 그룹도 없다.

```sql
-- GROUP BY 없이 전체 집계, 필터 결과 행이 0개
SUM(NVL(x, 0)) → NULL
NVL(SUM(x), 0) → 0
```

## 집계·JOIN

### GROUP BY의 역할 (group-01)

필수

같은 그룹끼리 묶어 집계

주의: 집계 함수는 일반적인 WHERE 조건식에 바로 쓸 수 없다.

SELECT에 집계 함수와 일반 컬럼을 함께 쓰면 일반 컬럼은 GROUP BY에 포함되어야 한다(또는 그룹 표현식으로 결정). WHERE는 그룹 전, HAVING은 그룹 후 필터링.

```sql
SELECT deptno, COUNT(*)
FROM emp
GROUP BY deptno;
```

### WHERE vs HAVING (group-02)

필수

WHERE는 개별 행 / HAVING은 집계된 그룹



GROUP BY 이전에 제거할 행은 WHERE, 그룹 자체에 대한 조건은 HAVING이다. HAVING 없이 전체 집합에 집계하는 것도 가능하다.

```sql
SELECT deptno, AVG(sal)
FROM emp
WHERE sal > 1000
GROUP BY deptno
HAVING AVG(sal) >= 3000;
```

### NULL을 GROUP BY 하면? (group-03)



NULL은 하나의 그룹으로 묶인다

주의: NULL이 서로 같다고 = 비교할 수 있다는 뜻은 아니다.

GROUP BY에서 동일한 그룹 키 값은 묶이고 NULL들도 같은 그룹으로 취급한다. DISTINCT 역시 선택된 열 조합 기준 중복 NULL 행을 제거한다.

```sql
deptno = [10, 10, NULL, NULL]
GROUP BY deptno → 10 그룹, NULL 그룹 (2개)
```

### INNER JOIN (group-04)

필수

양쪽 조인 조건에 맞는 행만 반환



조인 조건이 TRUE인 양쪽 행의 조합을 반환한다. 동등 조건뿐 아니라 부등호 등의 비동등 조건도 사용할 수 있다. 조인키가 중복이면 조건에 맞는 조합 수만큼 행이 늘어난다.

```sql
SELECT e.empno, d.dname
FROM emp e INNER JOIN dept d
  ON e.deptno = d.deptno;
```

### LEFT·RIGHT·FULL OUTER JOIN (group-05)

필수

기준 쪽은 일치 행 없어도 보존

주의: LEFT JOIN 결과 건수는 항상 왼쪽 행 수와 같지는 않다(오른쪽 다중 매칭 시 증가).

LEFT JOIN은 왼쪽 모든 행을 살리고 오른쪽 미일치 부분은 NULL, RIGHT는 반대, FULL은 양쪽 모두 보존한다. 일치 행은 조건과 중복도에 따라 복수로 생길 수 있다.

```sql
A(id): [1,2]
B(id): [2,3]
A LEFT JOIN B ON A.id=B.id → (1,NULL),(2,2)
FULL OUTER JOIN → (1,NULL),(2,2),(NULL,3)
```

### OUTER JOIN의 ON vs WHERE (group-06)

필수

ON은 매칭 기준 / WHERE는 JOIN 결과 필터

주의: OUTER JOIN 결과 건수와 NULL 행 계산의 핵심 함정.

LEFT JOIN에서 오른쪽 테이블 조건을 WHERE에 놓으면 NULL 확장 행이 제거되어 사실상 INNER JOIN처럼 될 수 있다. 왼쪽 모든 행 보존이 목적이면 일반적으로 ON에 우측 필터를 배치한다.

```sql
-- 왼쪽 전체 유지 가능
FROM A LEFT JOIN B ON A.id=B.id AND B.status='Y'
-- 우측 NULL 행 제거 가능
FROM A LEFT JOIN B ON A.id=B.id
WHERE B.status='Y'
```

### CROSS JOIN·카티션 곱 (group-07)



조인 조건 없이 모든 조합 = m × n



A가 3행, B가 4행이면 12행을 만든다. 쉼표 조인에서 WHERE의 조인 조건을 빠뜨리면 카티션 곱이 발생할 수 있다.

```sql
SELECT * FROM A CROSS JOIN B;  -- 3×4=12행
```

### NATURAL JOIN·USING·ON (group-09)



NATURAL: 동명 컬럼 자동 비교 / USING: 지정 / ON: 조건 직접

주의: NATURAL JOIN에서 모든 같은 이름 컬럼이 조인 대상이 된다는 점을 주의.

NATURAL JOIN은 양쪽 동일 이름 컬럼을 조인에 사용하므로 의도치 않은 동명 컬럼까지 연결될 수 있다. USING(key)은 지정된 동명 컬럼 기준, ON은 자유로운 조건.

```sql
FROM A JOIN B USING (deptno)
FROM A JOIN B ON A.deptno=B.deptno
```

### 다중 매칭 행 수 계산 (group-10)

필수

조인키 값마다 (왼쪽 건수 × 오른쪽 건수) 합산

주의: 단순히 A행 수 또는 B행 수를 그대로 답하지 않는다.

INNER JOIN에서 A의 key=1이 2개, B의 key=1이 3개라면 해당 키의 결과는 2×3=6행이다. 다른 키의 매칭을 더한다.

```sql
A: (1),(1),(2)
B: (1),(1),(1),(3)
INNER JOIN A.key=B.key → 6행
```

### GROUP BY에 없는 컬럼 SELECT (group-11)



집계가 아닌 일반 컬럼은 그룹 기준 필요



SELECT deptno, ename, AVG(sal) FROM emp GROUP BY deptno는 표준 집계 규칙에 어긋난다. ename이 그룹별 한 값을 보장한다고 명시된 방언 예외가 아닌 한 오류다.

```sql
-- 일반적인 SQL에서는 오류
SELECT deptno, ename, AVG(sal)
FROM emp GROUP BY deptno;
```

### 조인 후 COUNT(*) vs COUNT(B.col) (group-12)

필수

LEFT JOIN에서 미매칭도 COUNT(*)는 1행

주의: COUNT(B.pk)는 오른쪽의 NOT NULL 키를 기준으로 매칭된 행을 센다. 결과가 0이면 해당 그룹에 매칭이 없다. 미매칭 행은 LEFT JOIN 후 B.pk IS NULL로 구분한다.

LEFT JOIN 후 GROUP BY A.id로 묶으면 미매칭 A 행도 NULL 확장 1행으로 남는다. COUNT(*)=1, COUNT(B.pk)=0이 될 수 있다.

```sql
SELECT a.id, COUNT(*) AS rows_, COUNT(b.id) AS matched
FROM A a LEFT JOIN B b ON a.id=b.id
GROUP BY a.id;
```

## 서브쿼리·집합

### 서브쿼리 위치별 분류 (subquery-01)



스칼라 SELECT / 인라인뷰 FROM / WHERE 서브쿼리

주의: 스칼라 서브쿼리가 2행 이상 반환하면 대부분 DBMS에서 오류.

스칼라 서브쿼리는 한 행·한 열 값이 필요하고, FROM의 인라인 뷰는 가상 결과 테이블이다. WHERE에는 비교·IN·EXISTS 등을 활용한다.

```sql
SELECT e.ename, (SELECT d.dname FROM dept d
 WHERE d.deptno=e.deptno) AS dname
FROM emp e;
```

### 비상관 vs 상관 서브쿼리 (subquery-02)



상관 서브쿼리는 바깥 행 컬럼을 참조



상관 서브쿼리는 외부 SELECT의 각 행 값에 의존한다. 논리적으로 행별 조건 평가로 이해하면 편하다(실제 실행은 최적화 가능).

```sql
SELECT e.ename FROM emp e
WHERE e.sal > (SELECT AVG(x.sal) FROM emp x
               WHERE x.deptno=e.deptno);
```

### EXISTS / NOT EXISTS (subquery-03)

필수

하나라도 존재하면 TRUE / 존재하지 않으면 TRUE

주의: 서브쿼리가 SELECT NULL을 반환해도 행이 존재하면 EXISTS는 TRUE.

EXISTS는 서브쿼리에서 행이 있는지 여부를 판단하며 SELECT 값 자체는 의미가 없다. NOT EXISTS는 부재 검사에서 NULL 함정을 피하는 대표 도구다.

```sql
SELECT d.deptno FROM dept d
WHERE EXISTS (SELECT 1 FROM emp e WHERE e.deptno=d.deptno);
```

### IN / NOT IN과 NULL 함정 (subquery-04)

필수

NOT IN 목록에 NULL이 섞이면 예상 외로 0행 가능

주의: 실전 함정 최상위: NOT IN의 NULL 포함 여부를 반드시 확인.

x NOT IN (1,2,NULL)은 x<>1 AND x<>2 AND x<>NULL로 볼 수 있고 마지막 비교가 UNKNOWN이라 TRUE가 되지 못한다. NOT EXISTS 또는 NULL을 제거하는 조건이 안전하다.

```sql
3 NOT IN (1, 2, NULL) → UNKNOWN
-- WHERE에서는 이 행이 제거됨
```

### ANY(SOME) / ALL (subquery-05)

필수

> ANY는 하나라도 초과 / > ALL은 전부 초과

주의: 서브쿼리 집합이 비었거나 NULL을 포함하면 일반화가 달라질 수 있다.

비어 있지 않은 숫자 집합 [10,20]에 대해 > ANY는 10보다 크면 만족, > ALL은 20보다 커야 만족한다. < ANY는 최대값보다 작으면 만족, < ALL은 최소값보다 작아야 한다.

```sql
15 > ANY (10,20) → TRUE
15 > ALL (10,20) → FALSE
15 < ANY (10,20) → TRUE
```

### UNION vs UNION ALL (subquery-06)

필수

UNION 중복 제거 / UNION ALL 중복 유지



집합 연산자는 각 SELECT의 열 개수와 대응 데이터 타입이 호환되어야 한다. ORDER BY는 전체 집합 결과 마지막에 둔다.

```sql
SELECT deptno FROM A
UNION ALL
SELECT deptno FROM B;
```

### INTERSECT·MINUS(EXCEPT) (subquery-07)



INTERSECT 교집합 / MINUS 차집합



Oracle은 MINUS, 다른 DBMS는 EXCEPT를 주로 사용한다. 전통적인 UNION/INTERSECT/MINUS는 중복을 제거한다. 행 전체 조합을 기준으로 비교한다.

```sql
A={1,1,2}, B={1,3}
A INTERSECT B → {1}
A MINUS B → {2}
```

### 단일행 vs 다중행 연산자 (subquery-09)



=는 단일 값 / IN·ANY·ALL은 여러 값



서브쿼리 결과가 2행 이상인데 단일 값 비교 연산자 = 를 사용하면 오류가 난다. 0행인 스칼라 서브쿼리 결과는 보통 NULL이다.

```sql
WHERE x = (SELECT y FROM T)   -- 2행 이상이면 오류
WHERE x IN (SELECT y FROM T) -- 다중행 허용
```

## 윈도우·고급 SQL

### 윈도우 함수 구조 (window-01)



함수() OVER (PARTITION BY ... ORDER BY ...)

주의: 윈도우 함수는 일반적으로 WHERE에서 바로 사용할 수 없다.

GROUP BY는 행을 묶어 출력 행이 줄어들 수 있지만 윈도우 함수는 원래 행을 유지하면서 그룹별·순서별 계산을 덧붙인다. PARTITION BY는 계산 범위 분할, ORDER BY는 계산 순서다.

```sql
SELECT empno, deptno, sal,
 SUM(sal) OVER (PARTITION BY deptno) AS dept_total
FROM emp;
```

### RANK vs DENSE_RANK vs ROW_NUMBER (window-02)

필수

동점: RANK는 건너뜀 / DENSE_RANK는 안 건너뜀 / ROW_NUMBER는 고유 번호



값이 [100,100,90]일 때 RANK=1,1,3; DENSE_RANK=1,1,2; ROW_NUMBER=1,2,3. 동점 행의 ROW_NUMBER 순서는 추가 정렬 조건이 없으면 비결정적일 수 있다.

```sql
RANK() OVER (ORDER BY score DESC)
DENSE_RANK() OVER (ORDER BY score DESC)
ROW_NUMBER() OVER (ORDER BY score DESC)
```

### LAG·LEAD (window-03)



이전 행·다음 행의 값을 가져옴

주의: 첫 행 LAG 기본값 또는 마지막 행 LEAD는 기본값 없으면 NULL.

LAG(col, offset, default)는 앞 행, LEAD는 뒤 행의 값을 참조한다. 순서는 OVER의 ORDER BY에 따른다.

```sql
LAG(sal, 1, 0) OVER (ORDER BY empno)
LEAD(sal, 1) OVER (ORDER BY empno)
```

### NTILE(n) (window-04)



정렬된 행을 n개 그룹으로 최대한 균등 분할



행 수를 n개 버킷으로 나눈다. 나머지가 있으면 앞쪽 그룹부터 한 행씩 더 받는다. 예: 10행 NTILE(4)의 그룹 크기는 3,3,2,2.

```sql
NTILE(4) OVER (ORDER BY sal DESC)
```

### 윈도우 ROWS·RANGE (window-06)



ROWS 물리적 행 / RANGE 값의 범위·동점 관계

주의: 동점 순서와 누적합이 문제라면 ROWS/RANGE를 확인.

SUM(...) OVER (ORDER BY ...)는 DBMS에 따라 기본 프레임과 동점 처리에 차이가 있다. Oracle에서는 기본값이 RANGE UNBOUNDED PRECEDING ~ CURRENT ROW이므로 동점들이 한꺼번에 포함될 수 있다.

```sql
SUM(sal) OVER (ORDER BY sal
 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```

### ROLLUP(a,b) (window-07)

필수

(a,b) → (a) → 전체 합계 = 3단계

주의: ROLLUP 순서가 바뀌면 중간 소계 기준이 달라진다.

ROLLUP(a,b)는 상세그룹 (a,b), a별 소계, 총계를 생성한다. 일반적인 n개 단순 컬럼의 ROLLUP 그룹 집합은 n+1개다.

```sql
GROUP BY ROLLUP (deptno, job)
-- (deptno,job), (deptno), ()
```

### CUBE(a,b) (window-08)

필수

(a,b)·(a)·(b)·() = 4개 그룹 집합



CUBE는 지정된 그룹 컬럼의 가능한 모든 조합에 대한 집계를 생성한다. 단순 컬럼 n개면 2ⁿ개의 그룹 집합이 만들어진다.

```sql
GROUP BY CUBE (deptno, job)
-- (deptno,job), (deptno), (job), ()
```

### GROUPING SETS (window-09)



원하는 그룹 집합을 직접 나열



GROUPING SETS ((a),(b),())는 a별 집계, b별 집계, 전체 합계만 반환한다. CUBE/ROLLUP의 일부분을 선택할 때 유용하다.

```sql
GROUP BY GROUPING SETS ((deptno),(job),())
```

### GROUPING(col) (window-10)

필수

소계·총계 때문에 집계에서 제외된 컬럼이면 1

주의: 실제 데이터의 NULL과 소계 표기 NULL을 구분할 때 사용.

GROUPING(a)=1이면 그 그룹 집합에서 a가 집계 차원에서 제외된 것으로 생성된 NULL이다. 0이면 실제 그룹 컬럼이 포함된 것이다(실제 값이 NULL일 수도 있다).

```sql
SELECT deptno, GROUPING(deptno) g, SUM(sal)
FROM emp GROUP BY ROLLUP(deptno);
```

### Top-N: ROWNUM vs FETCH FIRST (window-11)

필수

Oracle ROWNUM은 정렬 전에 번호 부여될 수 있음

주의: 같은 SELECT의 WHERE ROWNUM <= 3 ORDER BY sal DESC는 전체 급여 상위 3명 보장 X.

정렬 후 상위 N개를 뽑으려면 ORDER BY를 내부 쿼리에 넣고 바깥에서 ROWNUM으로 거르거나, 지원하는 DBMS의 FETCH FIRST 문법을 쓴다.

```sql
SELECT * FROM (SELECT * FROM emp ORDER BY sal DESC)
WHERE ROWNUM <= 3;
-- 또는 SELECT ... ORDER BY sal DESC FETCH FIRST 3 ROWS ONLY;
```

### ROWNUM > 1의 함정 (window-12)

필수

Oracle에서 WHERE ROWNUM > 1은 결과가 없다



처음 읽힌 행의 ROWNUM은 1이므로 조건을 통과하지 못하고 다음 행도 다시 1부터 시작해 통과하지 못한다. 번호를 부여한 인라인뷰에서 바깥으로 필터하거나 ROW_NUMBER를 활용한다.

```sql
SELECT * FROM emp WHERE ROWNUM > 1; -- 0행
```

### 계층형 질의 CONNECT BY (window-13)

필수

START WITH 시작 행 / CONNECT BY 관계 / LEVEL 깊이

주의: PRIOR가 붙은 쪽을 기준으로 상위(부모) 행의 값을 참조한다.

Oracle에서 START WITH는 루트 조건, CONNECT BY PRIOR parent_id = child_parent_id는 부모→자식 탐색. LEVEL은 루트가 1, 자식이 2... 이다.

```sql
SELECT empno, mgr, LEVEL
FROM emp
START WITH mgr IS NULL
CONNECT BY PRIOR empno = mgr;
```

### PIVOT·UNPIVOT (window-15)



행 → 열 / 열 → 행



PIVOT은 특정 값별 집계를 열로 펼치고 UNPIVOT은 여러 컬럼을 행으로 만든다. Oracle UNPIVOT의 기본 동작은 NULL 값 행 제외이며 INCLUDE NULLS를 명시하면 포함된다.

```sql
SELECT * FROM sales
PIVOT (SUM(amount) FOR quarter IN ('Q1' AS Q1, 'Q2' AS Q2));
```

### 정규 표현식 (window-16)



^ 시작 / $ 끝 / . 임의 한 글자 / * 0회 이상 / + 1회 이상



REGEXP_LIKE로 문자열 패턴 충족 여부를 검사한다. [0-9] 숫자 한 글자, [A-Z] 대문자 한 글자, {n}은 정확히 n번 반복이다.

```sql
REGEXP_LIKE(col, '^[0-9]+$') -- 숫자만 한 글자 이상
```

## 관리 구문·트랜잭션

### SQL 명령어 분류 (command-01)

필수

DML SELECT/INSERT/UPDATE/DELETE · DDL CREATE/ALTER/DROP/TRUNCATE · TCL COMMIT/ROLLBACK/SAVEPOINT · DCL GRANT/REVOKE

주의: 일부 자료는 SELECT를 DML에 포함, 일부는 DQL로 구분한다. 기능 구분이 우선.

SELECT를 DQL로 따로 분류하기도 한다. 시험에서는 구문별 기능을 구분하고 트랜잭션 확정 여부를 비교한다.



### DELETE vs TRUNCATE vs DROP (command-02)

필수

행 삭제 / 전체 행 비우기 / 객체 자체 삭제

주의: Oracle에서 DDL은 암묵적 커밋과 관련됨. DBMS에 따라 TRUNCATE의 트랜잭션 처리 차이가 있다.

DELETE는 DML로 조건부 삭제 가능, ROLLBACK 가능(미커밋 시). Oracle의 TRUNCATE는 DDL로 전체 행 제거·일반적으로 ROLLBACK 불가, DROP은 테이블 정의 자체를 삭제한다.

```sql
DELETE FROM emp WHERE deptno = 10;
TRUNCATE TABLE emp;
DROP TABLE emp;
```

### INSERT·UPDATE·DELETE에서 WHERE (command-03)



UPDATE/DELETE에 WHERE 없으면 전체 행 대상



INSERT는 새 행을 추가한다. UPDATE는 기존 행을 수정하고 DELETE는 행을 제거한다. UPDATE와 DELETE에서 WHERE를 생략하면 테이블의 모든 행이 대상이 된다.

```sql
UPDATE emp SET sal = sal * 1.1 WHERE deptno = 10;
```

### CREATE·ALTER·DROP (command-04)



객체 생성·구조 변경·객체 삭제



ALTER TABLE ADD 컬럼, MODIFY 정의 변경, DROP COLUMN 컬럼 제거 등을 수행한다. SQL 방언에 따른 구체 문법은 다를 수 있다.

```sql
CREATE TABLE T (id NUMBER PRIMARY KEY);
ALTER TABLE T ADD (memo VARCHAR2(30));
DROP TABLE T;
```

### PK·UNIQUE·NOT NULL·FK·CHECK (command-05)

필수

기본키/유일/필수/참조/값 제한

주의: UNIQUE는 DBMS에 따라 NULL 허용 규칙의 세부 차이가 있으므로 제시된 DBMS를 확인.

PRIMARY KEY는 유일하고 NULL 불가. UNIQUE는 중복 방지(Oracle은 여러 NULL 허용). FOREIGN KEY는 다른 테이블 키를 참조하는 참조 무결성 제약. CHECK는 값 조건 검증.

```sql
id NUMBER PRIMARY KEY
email VARCHAR2(100) UNIQUE
age NUMBER CHECK (age >= 0)
```

### FK와 참조 무결성 (command-06)



참조하는 값은 부모 키에 존재해야 함(또는 허용된 NULL)



외래키는 참조 대상의 기본키 또는 유일키를 가리키며 부모 없는 값을 넣지 못하게 한다. ON DELETE CASCADE를 설정하면 부모 삭제 시 자식 행도 제거된다.

```sql
FOREIGN KEY (deptno) REFERENCES dept(deptno)
ON DELETE CASCADE;
```

### COMMIT·ROLLBACK·SAVEPOINT (command-07)

필수

확정 / 미확정 취소 / 부분 복귀 지점

주의: 커밋한 내용은 일반적인 ROLLBACK으로 되돌릴 수 없다.

COMMIT은 트랜잭션 확정, ROLLBACK은 마지막 COMMIT 이후 작업 되돌림, SAVEPOINT는 트랜잭션 내부 복귀 지점. 이후 전체 ROLLBACK도 가능하다.

```sql
SAVEPOINT s1;
UPDATE emp SET sal = 100 WHERE empno = 1;
ROLLBACK TO s1;
COMMIT;
```

### DDL과 암묵적 COMMIT (Oracle) (command-08)

필수

Oracle: 문법적으로 유효한 DDL 실행 전, 성공한 DDL 실행 후 암묵적 COMMIT

주의: 이미 수행한 DML도 DDL 실행 전에 커밋될 수 있다.

Oracle은 문법적으로 유효한 DDL 실행 전에 암묵적으로 COMMIT한다. 해당 DDL 실행이 오류로 끝나더라도 이전 DML은 이미 커밋될 수 있다. DDL 실행 후에는 성공했을 때만 암묵적으로 COMMIT한다. 다른 DBMS의 동작과 혼동하지 않는다.



### GRANT·REVOKE (command-09)



권한 부여 / 권한 회수



GRANT SELECT ON T TO user1: 조회 권한 부여. REVOKE SELECT ON T FROM user1: 조회 권한 회수. 권한 부여 옵션(예: WITH GRANT OPTION)도 출제 가능하다.

```sql
GRANT SELECT ON emp TO analyst;
REVOKE SELECT ON emp FROM analyst;
```

### 트랜잭션 ACID (command-10)



원자성 · 일관성 · 격리성 · 지속성



Atomicity: 전부 성공 또는 전부 취소. Consistency: 제약 조건을 일관되게 유지. Isolation: 동시 트랜잭션 간 영향 제어. Durability: 커밋한 결과를 보존.
