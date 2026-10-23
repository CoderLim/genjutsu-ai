# Seedance 2.5 提示词评测 Case（Genjutsu）

> 生成自 commit `72ae6c7`（`fix(genjutsu): refine identity rules and multi-reference mapping`）
> 来源：`buildSeedanceWorkflowPrompt()` 最终组装结果（默认 FAL 标记 `@Video1` / `@ImageN`）

## 使用说明

- `@Video1` = 源视频；`@Image1…N` = 参考图（上传顺序 = Reference 顺序）
- **WaveSpeed**：把 `@Video1` / `@ImageN` 改成 `@Video 1` / `@Image N`（空格）
- **Volcengine Ark**：视频 `@视频1`，图片 `@图像N`
- **SeeAPI Object Swap 多图**：整段 prompt 前加 `编辑视频：`，末尾再加下文「SeeAPI 多图后缀」
- 优先测：**1、2、3、5、6、12、13**
- 测完记录 Case 号 + 好/坏现象即可

## Case 索引

| #   | 场景                    | 图数 | 期望                                    | chars |
| --- | ----------------------- | ---: | --------------------------------------- | ----: |
| 1   | OS · 完整人物替换       |    1 | 脸/发型/体型/衣服跟参考图，不混原视频人 |  1547 |
| 2   | MT · 参考人物跳舞       |    1 | 动作用视频，表演者是参考人              |  1384 |
| 3   | OS · 只换衣服           |    1 | 只改衣服，脸不变                        |  1578 |
| 4   | OS · 只换背景           |    1 | 只改背景，人物不变                      |  1569 |
| 5   | OS · 三人物分别替换     |    3 | 三人各对应一张图，不串脸                |  1829 |
| 6   | OS · 人+衣服+背景混合   |    3 | 仅 Ref1 完整换人；2=衣；3=背景          |  1840 |
| 7   | OS · 同一人多视角       |    3 | 三图同一身份，不拆成三人                |  1828 |
| 8   | OS · 动物替换           |    1 | 猫→狗，完整主体替换                     |  1536 |
| 9   | OS · 汽车/物体替换      |    1 | 换车，勿套用人脸逻辑                    |  1534 |
| 10  | MT · 只换场景           |    1 | 换环境，保留原表演者                    |  1395 |
| 11  | MT · 人物+场景          |    2 | Ref1=人，Ref2=场景                      |  1596 |
| 12  | OS · Say It Right Dance |    1 | 线上已验证成功的完整换人对照            |  2861 |
| 13  | OS · Long Trival 三人物 |    3 | 开场舞者 / 自拍 / 下车 三人映射         |  2282 |
| 14  | OS · 单图无用户提示     |    1 | 默认替换最显著匹配目标                  |  1541 |
| 15  | MT · 单图无用户提示     |    1 | 有对应才改外观，否则保留源              |  1507 |

## SeeAPI 多图后缀

复现 SeeAPI objects-swap 多图时，在完整 prompt 前加 `编辑视频：`，末尾追加：

```text
MULTI-REFERENCE EDITING:
Apply each explicitly specified reference-to-target mapping according to its assigned role. For complete person or character replacement, preserve the assigned reference identity. For clothing, props, objects, backgrounds, or partial edits, modify only the requested elements. Do not treat every reference as a separate person or character. Do not merge unrelated identities or change subjects not explicitly assigned for replacement.
```

---

## CASE 1 · OS · 完整人物替换

- **mode:** `objects-swap`
- **images:** 1
- **chars:** 1547
- **期望:** 脸/发型/体型/衣服跟参考图，不混原视频人

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference 1 maps to @Image1.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace the lead dancer in the source video with the person from Reference 1.
```

## CASE 2 · MT · 参考人物跳舞

- **mode:** `motion-transfer`
- **images:** 1
- **chars:** 1384
- **期望:** 动作用视频，表演者是参考人

```text
MOTION TRANSFER:
Use @Video1 for motion, choreography, poses, camera, framing, timing, and shot progression. When a reference defines the performer, animate that reference subject rather than retaining the original performer's identity. Apply other reference-defined changes only as instructed. Keep referenced elements visually consistent; do not change motion, camera, timing, framing, or shot progression unless explicitly requested.
Reference 1 maps to @Image1.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
User instruction: Make the person from Reference 1 perform the dance from the source video.
```

## CASE 3 · OS · 只换衣服

- **mode:** `objects-swap`
- **images:** 1
- **chars:** 1578
- **期望:** 只改衣服，脸不变

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference 1 maps to @Image1.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace only the red jacket with the clothing from Reference 1. Keep the original person identity unchanged.
```

## CASE 4 · OS · 只换背景

- **mode:** `objects-swap`
- **images:** 1
- **chars:** 1569
- **期望:** 只改背景，人物不变

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference 1 maps to @Image1.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace the street background with the forest location from Reference 1. Keep all people unchanged.
```

## CASE 5 · OS · 三人物分别替换

- **mode:** `objects-swap`
- **images:** 3
- **chars:** 1829
- **期望:** 三人各对应一张图，不串脸

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference labels map to provider images as follows: Reference 1 = @Image1, Reference 2 = @Image2, Reference 3 = @Image3.
Use the task instruction to map each reference to its target. Do not merge unrelated reference identities or assign a reference to an unspecified target.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace Character 1 with Reference 1.
Replace Character 2 with Reference 2.
Replace Character 3 with Reference 3.
```

## CASE 6 · OS · 人+衣服+背景混合

- **mode:** `objects-swap`
- **images:** 3
- **chars:** 1840
- **期望:** 仅 Ref1 完整换人；2=衣；3=背景

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference labels map to provider images as follows: Reference 1 = @Image1, Reference 2 = @Image2, Reference 3 = @Image3.
Use the task instruction to map each reference to its target. Do not merge unrelated reference identities or assign a reference to an unspecified target.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Reference 1 replaces the main character.
Reference 2 replaces the character's clothing.
Reference 3 replaces the background.
```

## CASE 7 · OS · 同一人多视角

- **mode:** `objects-swap`
- **images:** 3
- **chars:** 1828
- **期望:** 三图同一身份，不拆成三人

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference labels map to provider images as follows: Reference 1 = @Image1, Reference 2 = @Image2, Reference 3 = @Image3.
Use the task instruction to map each reference to its target. Do not merge unrelated reference identities or assign a reference to an unspecified target.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
References 1, 2, and 3 are different views of the same person. Replace the foreground dancer with that identity.
```

## CASE 8 · OS · 动物替换

- **mode:** `objects-swap`
- **images:** 1
- **chars:** 1536
- **期望:** 猫→狗，完整主体替换

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference 1 maps to @Image1.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace the cat in the source video with the dog from Reference 1.
```

## CASE 9 · OS · 汽车/物体替换

- **mode:** `objects-swap`
- **images:** 1
- **chars:** 1534
- **期望:** 换车，勿套用人脸逻辑

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference 1 maps to @Image1.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace the orange motorcycle with the vehicle from Reference 1.
```

## CASE 10 · MT · 只换场景

- **mode:** `motion-transfer`
- **images:** 1
- **chars:** 1395
- **期望:** 换环境，保留原表演者

```text
MOTION TRANSFER:
Use @Video1 for motion, choreography, poses, camera, framing, timing, and shot progression. When a reference defines the performer, animate that reference subject rather than retaining the original performer's identity. Apply other reference-defined changes only as instructed. Keep referenced elements visually consistent; do not change motion, camera, timing, framing, or shot progression unless explicitly requested.
Reference 1 maps to @Image1.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
User instruction: Move the whole fight into the forest from Reference 1. Keep the original performers.
```

## CASE 11 · MT · 人物+场景

- **mode:** `motion-transfer`
- **images:** 2
- **chars:** 1596
- **期望:** Ref1=人，Ref2=场景

```text
MOTION TRANSFER:
Use @Video1 for motion, choreography, poses, camera, framing, timing, and shot progression. When a reference defines the performer, animate that reference subject rather than retaining the original performer's identity. Apply other reference-defined changes only as instructed. Keep referenced elements visually consistent; do not change motion, camera, timing, framing, or shot progression unless explicitly requested.
Reference labels map to provider images as follows: Reference 1 = @Image1, Reference 2 = @Image2.
Use the user instruction to determine how each reference relates to @Video1. Do not blend traits between unrelated references unless explicitly asked.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
User instruction: Use Reference 1 for the fighter and Reference 2 for the location.
```

## CASE 12 · OS · Say It Right Dance

- **mode:** `objects-swap`
- **images:** 1
- **chars:** 2861
- **期望:** 线上已验证成功的完整换人对照

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference 1 maps to @Image1.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace the entire foreground dancer wearing a bright pink T-shirt and purple backpack in the source video with the person from Reference 1.

This is a COMPLETE PERSON REPLACEMENT, not a clothing change, partial face swap, or identity blend.

IDENTITY PRIORITY:
Reference 1 is the sole source of the replacement person's identity and physical appearance.

Recreate their recognizable facial features, eye shape, nose, mouth, jawline, facial proportions, apparent age, natural hairstyle, hairline, skin tone, body proportions, and clothing according to Reference 1.

The original dancer's face, hairstyle, apparent age, body appearance, and clothing must not carry over into the replacement.

Do not blend or average the original dancer's identity with Reference 1.

VIDEO PRESERVATION:
Use the source video only for dance movements, body poses, camera movement, framing, timing, perspective, lighting, and the surrounding environment.

Adapt the replacement person's appearance and proportions naturally to the source movements. Prioritize recognizable identity over preserving the original dancer's silhouette.

Maintain the same replacement identity consistently throughout every frame, including head turns, expressions, and partial occlusions.

Preserve all other people and the background unchanged.

Ignore unrelated background objects and handheld props appearing only in Reference 1.
```

## CASE 13 · OS · Long Trival 三人物

- **mode:** `objects-swap`
- **images:** 3
- **chars:** 2282
- **期望:** 开场舞者 / 自拍 / 下车 三人映射

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference labels map to provider images as follows: Reference 1 = @Image1, Reference 2 = @Image2, Reference 3 = @Image3.
Use the task instruction to map each reference to its target. Do not merge unrelated reference identities or assign a reference to an unspecified target.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace the three main characters in the source video with the people from the assigned reference images.

REFERENCE MAPPING:

Reference 1 replaces the opening dancer.
Reference 2 replaces the selfie character.
Reference 3 replaces the character stepping out of the car.

Each replacement character must retain the identity, facial features, hairstyle, clothing, and body proportions of their assigned reference.

Do not mix identities or swap character assignments.

Preserve the original movements, camera angles, scene transitions, vehicles, lighting, and timing.
```

## CASE 14 · OS · 单图无用户提示

- **mode:** `objects-swap`
- **images:** 1
- **chars:** 1541
- **期望:** 默认替换最显著匹配目标

```text
Edit @Video1 by replacing only the targets specified in the task instruction with their assigned reference images.
Reference 1 maps to @Image1.
OBJECT SWAP:
Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
TASK INSTRUCTION:
Replace the most prominent matching target in @Video1 with Reference 1.
```

## CASE 15 · MT · 单图无用户提示

- **mode:** `motion-transfer`
- **images:** 1
- **chars:** 1507
- **期望:** 有对应才改外观，否则保留源

```text
MOTION TRANSFER:
Use @Video1 for motion, choreography, poses, camera, framing, timing, and shot progression. When a reference defines the performer, animate that reference subject rather than retaining the original performer's identity. Apply other reference-defined changes only as instructed. Keep referenced elements visually consistent; do not change motion, camera, timing, framing, or shot progression unless explicitly requested.
Reference 1 maps to @Image1.
REFERENCE IDENTITY:
For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.
For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.
If a clear visual correspondence exists, use @Image1 to guide that element's appearance while preserving motion, camera, timing, framing, and shot progression from @Video1. Otherwise preserve the source appearance.
```
