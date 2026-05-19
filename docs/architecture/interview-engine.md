# Interview Engine

This document describes the first lean prototype flow for Request Architect.

The product starts as a guided interview, not as a form.

## Core Principles

- Ukrainian is the default interface language.
- The interviewer continues in the language used by the client.
- Russian can be handled by auto-detection in the interview, but generated documents are officially supported only in Ukrainian and English for MVP.
- The project type is discovered conversationally.
- Every message is saved.
- Every session maintains a raw transcript, working context Markdown, and structured JSON state.
- The client can leave at any time without losing progress.
- Raw/incomplete briefs are handled through human-in-the-loop review by the owner.

## Roles

## Client

The person who answers the interview.

The client:

- enters email
- enters a simulated one-time code
- provides name if new
- answers interview questions
- may pause, leave, or finish the session
- receives the final brief by email when the owner sends it

## Owner

The freelancer, agency, or operator who owns the link.

The owner:

- has an owner link/admin view
- sees all interview statuses
- sees completed and incomplete sessions
- reviews raw briefs before sending
- may edit or add context before sending follow-up emails
- receives final briefs by email

## Session Entry

The first screen is a chat.

Default greeting:

```text
Вітаю. Я допоможу перетворити нечіткий запит на робочий бриф для виконавця.

Щоб зберегти розмову і дати вам можливість повернутись пізніше, напишіть, будь ласка, ваш email.
```

## Email Code

For the prototype, email code verification is simulated.

Flow:

1. Client enters email.
2. System creates a verification code.
3. System immediately creates or updates a `client_sessions` row with `status = code_pending`.
4. System stores the greeting, client email, and verification prompt in `interview_messages`.
5. In development, the code can be shown in the UI or logs.
6. Client enters the code in chat.
7. System verifies the code.

Later, this becomes a real email one-time code.

Important rule:

- every valid email initiation is a lead and must be visible to the owner, even if the client never verifies the code.

## Returning Client

After email verification, the system checks previous sessions by email.

If there is an active or incomplete session:

- load transcript
- load working context Markdown
- load JSON state
- summarize where the conversation stopped
- ask whether to continue

Example:

```text
Я знайшов попередню сесію. Минулого разу ми вже зрозуміли, що вам потрібен сайт для салону, але ще не визначили критерії приймання і межі задачі.

Продовжимо з цього місця?
```

If there are multiple sessions, MVP may select the latest active session.

## New Client

If no previous session exists:

1. Ask for name.
2. Start project discovery conversationally.

Example:

```text
Як до вас звертатись?
```

Then:

```text
[Name], розкажіть простими словами: що ви хочете замовити або створити?
```

## Universal Interview Flow

The prototype uses a universal flow for all project types.

The interviewer should infer project type instead of asking the user to choose from a dropdown.

## Stage 1. Initial Request

Goal: understand what the client wants to order or create.

Main question:

```text
Що ви хочете замовити або створити?
```

Extract:

- initial request
- possible project type
- client phrases
- vague terms

Prototype implementation:

- save the user answer to `interview_messages`
- copy the answer to `client_sessions.initial_request`
- update `working_context_markdown`
- update `state_json.project.initialRequest`
- move `current_stage` to `business_context`

## Stage 2. Business Context

Goal: understand what business, project, or situation this belongs to.

Main question:

```text
Коротко розкажіть, будь ласка, про ваш бізнес або ситуацію, для якої потрібен цей результат.
```

Extract:

- business description
- market/category
- current situation
- reason this task appeared now

## Stage 3. Desired Change

Goal: understand what should change after the work is done.

Main question:

```text
Що має змінитись після того, як ця робота буде зроблена?
```

Extract:

- goal
- business outcome
- emotional outcome
- success direction

## Stage 4. Audience

Goal: understand who the result is for.

Main question:

```text
Для кого це створюється в першу чергу?
```

Extract:

- primary audience
- secondary audience
- audience doubts
- desired audience action

## Stage 5. Expected Result

Goal: understand minimum deliverables and visible result.

Main question:

```text
Що обов'язково має бути у фінальному результаті?
```

Extract:

- deliverables
- must-have items
- nice-to-have items
- implied scope

## Stage 6. Taste And Direction

Goal: unpack subjective language.

Main question:

```text
Як це має виглядати або відчуватись? Можна простими словами, навіть якщо вони поки неточні.
```

Extract:

- taste dictionary
- references
- emotional tone
- words to preserve
- things to avoid

## Early Brief Decision

After stage 6, the deterministic prototype should offer an early brief moment.

If the client agrees to continue, move to `scope`.

If the client does not want to continue, move to `paused_raw_brief` and keep the session visible to the owner with open questions.

The message should make the missing points feel practically important, not bureaucratic.

## Early Brief Moment

After stages 1-6, the system can usually create an early raw brief.

The interviewer should not immediately end. It should show the client what is already captured and what still matters.

Example:

```text
Ми вже можемо зібрати перший чорновий бриф.

У ньому буде зафіксовано:
- що ви хочете створити;
- для якого бізнесу;
- для кого це потрібно;
- який результат ви очікуєте;
- які слова описують бажаний стиль.

Але є два пункти, які сильно вплинуть на роботу виконавця:
1. межі задачі;
2. критерії приймання.

Якщо їх не уточнити, виконавець зможе почати розмову, але частину рішень доведеться здогадуватись або приймати самостійно.

Закриємо ці два пункти коротко?
```

## Stage 7. Scope Boundaries

Goal: prevent accidental scope expansion.

Main question:

```text
Що точно входить у цю задачу, а що краще залишити за межами першого етапу?
```

If the client struggles, offer simple options or ask what they do not want to pay for now.

Extract:

- in scope
- out of scope
- future scope
- delegated decisions

## Stage 8. Acceptance Criteria

Goal: convert subjective approval into observable signals.

Main question:

```text
Як ви зрозумієте, що результат можна приймати?
```

If the client says "I will know when I see it", respond:

```text
Це природна відповідь, але для виконавця вона небезпечна: робота може бути якісною, а ви все одно відчуєте "не те".

Давайте зафіксуємо хоча б 2-3 ознаки, за якими ви скажете: так, це рухається в правильний бік.
```

Extract:

- acceptance criteria
- decision makers
- revision expectations
- quality signals

## Stage 9. Risks And Open Questions

Goal: name what can still break clarity.

Main question:

```text
Є щось, що може завадити роботі або викликати суперечки пізніше?
```

Extract:

- risks
- unresolved tensions
- missing information
- decisions deferred to contractor

## Handling "I Don't Know"

If the client says they do not know, the interviewer should normalize it and make the consequence explicit.

Example:

```text
Це нормально. Тоді є два шляхи.

Перший: ми залишаємо це рішення виконавцю. У брифі буде прямо зафіксовано, що ви довіряєте виконавцю самостійно прийняти це рішення.

Другий: я запропоную кілька простих варіантів, і ви виберете той, який ближче.

Можемо також відкласти це питання і повернутись до нього після кількох наступних відповідей.
```

Allowed outcomes:

- client chooses from options
- client delegates the decision to contractor
- client defers the question
- client marks it as an open question

Delegation must be explicit.

Example state:

```json
{
  "area": "style",
  "decisionOwner": "contractor",
  "clientApprovedDelegation": true,
  "note": "Client could not define visual direction and explicitly agreed to trust contractor judgment."
}
```

## Client Wants To Finish

If the client says "enough", "finish", "that's all", or similar, the interviewer should confirm.

Example:

```text
Можемо завершити зараз. Перед цим покажу, що залишиться відкритим.

Відкриті питання:
1. ...
2. ...
3. ...

Якщо завершуємо зараз, бриф буде робочим, але не повністю завершеним. Виконавець зможе почати обговорення, але частину рішень доведеться приймати окремо.

Завершуємо і формуємо бриф?
```

If the client confirms:

- mark session as completed
- generate Client Brief
- email final brief to client and owner

## Client Leaves The Chat

Every iteration is saved.

If the client closes the window:

- do not automatically send a raw brief to the client
- generate an internal incomplete-session note for the owner
- generate a draft follow-up email for the owner
- mark session as paused or abandoned

The owner decides whether to send the follow-up email as-is or edit it.

Example follow-up email:

```text
Тема: Ваш бриф збережено, але кілька важливих пунктів ще відкриті

Вітаю, [Name].

Ми зберегли ваші відповіді і вже можемо скласти чорновий бриф. Але перед стартом роботи бажано уточнити кілька пунктів:

1. [Open question]
2. [Open question]
3. [Open question]

Ці питання важливі, тому що вони впливають на межі роботи, очікування і приймання результату.

Ви можете повернутись до інтерв'ю і продовжити з того місця, де зупинились:
[continue link]
```

## Email Delivery

Final brief email recipients:

- client
- owner

Incomplete-session follow-up:

- generated for owner review
- not automatically sent to client in MVP

## Stored Data Layers

## Raw Transcript

Full message-by-message chat.

Used for:

- auditability
- future regeneration
- debugging
- recovering lost context

## Working Context Markdown

Human-readable evolving summary of the project.

Updated after each meaningful client answer.

Used for:

- model context
- owner review
- future continuation
- generating draft brief

## Structured JSON State

Machine-readable state for clarity, readiness, UI, and branching.

See `docs/architecture/interview-state.md`.
