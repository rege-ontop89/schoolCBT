---
description: Defines the execution order and gate criteria for agent progression
---

# SchoolCBT Execution Order Workflow

## Gate Criteria

Each phase has explicit gate criteria that must be met before agents can proceed.

### Phase 1 Gate (Foundation → Core)
- [ ] `exam.schema.json` created and validated
- [ ] `results.schema.json` created and validated
- [ ] Inter-agent contracts documented
- [ ] PM approval obtained

### Phase 2 Gate (Core → Integration)
- [ ] Admin Tool produces valid JSON per schema
- [ ] Student UI consumes and renders exam JSON
- [ ] Timer functionality operational
- [ ] Skip/return navigation working
- [ ] PM approval obtained

### Phase 3 Gate (Integration → Validation)
- [ ] Integrity module integrated
- [ ] Google Sheets submission functional
- [ ] All components integrated
- [ ] PM approval obtained

### Phase 4 Gate (Validation → Freeze)
- [ ] All QA tests passed
- [ ] Constraint compliance verified
- [ ] No critical issues open
- [ ] PM declares version freeze

## Agent Dependencies

```
System Architect ──┬──→ Admin Tool Agent
                   │
                   └──→ Student UI Agent ──┬──→ Integrity Module Agent
                                           │
                                           └──→ Sheets Integration Agent
                                                        │
                                                        ▼
                                                   QA Agent
```

## Unblock Commands

Only the PM may issue these commands:

- `UNBLOCK Phase 1` - Enables System Architect
- `UNBLOCK Phase 2` - Enables Admin Tool + Student UI Agents
- `UNBLOCK Phase 3` - Enables Integrity + Sheets Agents
- `UNBLOCK Phase 4` - Enables QA Agent
- `FREEZE v1.0.0` - Declares version freeze
