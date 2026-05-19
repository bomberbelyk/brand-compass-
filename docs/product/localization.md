# Localization

Request Architect MVP must support two languages:

- Ukrainian
- English

The interviewer may also respond in Russian through language auto-detection if the client writes in Russian. Russian is not an official MVP document language.

The product should not treat localization as a simple UI translation layer. The interviewer's language is part of the product experience.

## Language Behavior

The interviewer should answer in the user's language.

If the user starts in Ukrainian, continue in Ukrainian.

If the user starts in English, continue in English.

If the user starts in Russian, continue in Russian during the interview.

If the user mixes languages, keep the dominant language and preserve important original wording.

Example:

```text
User: Хочу сайт, щоб він виглядав premium but not cold.
Assistant: Я чую важливе поєднання: "premium", але не холодний. Давайте уточнимо, що саме має створювати теплоту.
```

## MVP UI Languages

MVP interface copy should exist in:

- `uk`
- `en`

Default language can be selected from:

- browser locale
- user profile setting
- project setting

For MVP, project language is especially important because generated documents should match the language expected by the contractor or client.

## Document Language

Each project should have a document language:

- Ukrainian
- English

For MVP, document language is inferred from the client language where possible. Ukrainian and English are the primary supported document outputs.

Example:

```text
Interview language: Ukrainian
Document language: English
```

## Tone Adaptation

The Ukrainian version should sound natural, warm, and precise. Avoid bureaucratic calques and overly formal phrasing.

The English version should sound professional, clear, and human. Avoid generic SaaS language and motivational filler.

## Copy Principles

- translate meaning, not word-for-word phrases
- preserve client-specific wording
- keep interview questions short
- avoid overexplaining the product inside the UI
- mark missing information clearly in the selected document language
