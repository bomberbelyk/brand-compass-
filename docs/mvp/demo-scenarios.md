# Demo Scenarios

The prototype should be tested against five different client request types.

Each scenario starts with a vague request and should end with a Client Brief that is useful enough for a freelancer or small agency to discuss, estimate, or start planning the work.

For manual testing with a simulated difficult client, use:

- `docs/mvp/difficult-client-simulator-prompt.md`

## Success Criteria For Each Demo

The demo is successful if the system:

- makes the client feel understood
- asks one question at a time
- identifies vague terms
- extracts concrete goals and constraints
- names contradictions softly
- creates a useful Client Brief even if the interview is incomplete
- marks missing information clearly
- produces the brief in the selected document language
- preserves important client phrases

## Scenario 1. Premium Website With Vague Taste

Initial request:

```text
Хочу сучасний сайт для преміального салону краси. Має виглядати дорого, але не пафосно.
```

Why this scenario matters:

- tests vague taste words
- tests "premium but not arrogant"
- tests style unpacking
- tests audience and positioning

Expected interviewer behavior:

- preserve "дорого, але не пафосно"
- ask for concrete references
- clarify audience
- clarify business outcome
- define what "premium" means visually and emotionally

Success signal:

- the final brief contains a taste dictionary and concrete acceptance criteria for visual tone

## Scenario 2. Fast Landing Page With Scope Risk

Initial request:

```text
Нам терміново потрібен лендинг для запуску курсу. Хочемо швидко, красиво, з оплатою, аналітикою, CRM і всім необхідним.
```

Why this scenario matters:

- tests timeline versus scope contradiction
- tests prioritization
- tests ability to reduce complexity without frustrating the client

Expected interviewer behavior:

- name the tension between speed and feature list
- ask what must be ready for launch
- separate MVP launch scope from later improvements
- clarify payment and CRM as must-have or nice-to-have

Success signal:

- the brief separates launch scope from later scope and records priority decisions

## Scenario 3. Brand Identity For An Unclear Audience

Initial request:

```text
Потрібен логотип і фірмовий стиль для нового бренду. Хочемо, щоб він подобався всім і виглядав унікально.
```

Why this scenario matters:

- tests "for everyone" problem
- tests uniqueness versus broad appeal
- tests brand positioning questions

Expected interviewer behavior:

- gently challenge "for everyone"
- ask who must recognize themselves in the brand first
- clarify market category and competitors
- ask what should definitely be avoided

Success signal:

- the brief defines a primary audience and marks secondary audiences separately

## Scenario 4. Investor Presentation With High Stakes

Initial request:

```text
Нам потрібна презентація для інвесторів. Треба, щоб виглядало сильно, переконливо і дорого.
```

Why this scenario matters:

- tests business context
- tests desired outcome
- tests acceptance criteria beyond visual quality
- tests document language choice, possibly English output

Expected interviewer behavior:

- clarify who the investors are
- ask what decision the deck should help achieve
- clarify available data and proof
- unpack "strong" and "convincing"
- ask what must be believed after the presentation

Success signal:

- the brief names the investor decision, key proof points, missing data, and acceptance criteria

## Scenario 5. Digital Product MVP With Unclear Boundaries

Initial request:

```text
Хочу зробити застосунок для бронювання послуг. Поки складно пояснити, але має бути простий, зручний і як у топових сервісів.
```

Why this scenario matters:

- tests product discovery
- tests scope boundaries
- tests technical requirements
- tests "simple" and "like top services"

Expected interviewer behavior:

- ask for the first core user action
- clarify user roles
- define MVP flow
- separate essential functions from future features
- ask what "simple" means in use

Success signal:

- the brief contains a minimal product flow, core features, out-of-scope items, and open technical questions
