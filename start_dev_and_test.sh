kill $(lsof -t -i :5173) 2>/dev/null || true
npm run dev > dev.log 2>&1 &
sleep 5
python3 test_bracket_input.py
